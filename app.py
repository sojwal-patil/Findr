import io
import csv
import urllib.parse
import urllib.request
import asyncio
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, Response, HTTPException, Query
from fastapi.responses import HTMLResponse, StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from search_engine import matcher

app = FastAPI(title="Product Image Finder & CSV Enricher", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class ProductSearchRequest(BaseModel):
    product_name: str
    custom_query: Optional[str] = None

class BatchSearchRequest(BaseModel):
    products: List[dict]  # list of {id: ..., name: ..., original_row: ...}

class ExportRequest(BaseModel):
    headers: List[str]
    rows: List[dict]
    format: Optional[str] = "csv"

@app.get("/api/health")
def health():
    return {"status": "ok", "message": "Product Image Finder is running smoothly"}

@app.get("/api/proxy-image")
def proxy_image(url: str = Query(..., description="Target image URL")):
    """
    Proxies external images to bypass hotlinking and CORS restrictions.
    """
    try:
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Referer': url
            }
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            content_type = resp.headers.get('Content-Type', 'image/jpeg')
            data = resp.read()
            return Response(content=data, media_type=content_type)
    except Exception as e:
        # Fallback redirect or 404
        return Response(status_code=302, headers={"Location": url})

@app.post("/api/search-item")
def search_item(req: ProductSearchRequest):
    query = req.custom_query if req.custom_query else req.product_name
    result = matcher.find_best_images(query, count=6)
    result["product_name"] = req.product_name
    return result

@app.post("/api/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    """
    Parses an uploaded CSV file, identifies the product name column,
    and returns initial structured product rows.
    """
    try:
        content = await file.read()
        # Decode utf-8 with fallback
        try:
            text = content.decode('utf-8-sig')
        except UnicodeDecodeError:
            text = content.decode('latin-1')

        reader = csv.reader(io.StringIO(text))
        rows = list(reader)

        if not rows:
            raise HTTPException(status_code=400, detail="CSV file is empty.")

        headers = [h.strip() for h in rows[0]]
        
        # Check if first row looks like a header or actual data
        has_header = True
        first_row_lower = [h.lower() for h in headers]
        name_col_idx = 0

        # Auto-detect product name column
        for idx, col in enumerate(first_row_lower):
            if any(k in col for k in ['product', 'name', 'title', 'item', 'description', 'sku']):
                name_col_idx = idx
                break

        data_rows = rows[1:] if has_header else rows
        
        parsed_items = []
        for i, row in enumerate(data_rows):
            if not row or not any(field.strip() for field in row):
                continue
            name = row[name_col_idx].strip() if name_col_idx < len(row) else ""
            if not name:
                continue
            
            # Check if there is already an existing image url in row
            existing_image = ""
            for cell in row:
                if cell.startswith("http") and any(ext in cell.lower() for ext in ['.jpg', '.png', '.jpeg', '.webp', '.avif', 'image']):
                    existing_image = cell
                    break

            parsed_items.append({
                "id": f"item-{i+1}",
                "row_index": i + 1,
                "product_name": name,
                "image_url": existing_image,
                "thumbnail_url": existing_image,
                "match_score": 100 if existing_image else 0,
                "status": "ready" if not existing_image else "completed",
                "candidates": [],
                "raw_row": row
            })

        return {
            "success": True,
            "filename": file.filename,
            "headers": headers,
            "detected_column": headers[name_col_idx] if headers else "Column 1",
            "detected_col_index": name_col_idx,
            "total_items": len(parsed_items),
            "items": parsed_items
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

@app.get("/api/sample-csv")
def get_sample_csv():
    """
    Returns a realistic product dataset CSV for instant testing.
    """
    sample_products = [
        ["Product Name", "Category", "Price"],
        ["Apple iPhone 15 Pro 128GB Black Titanium", "Smartphones", "$999"],
        ["Sony WH-1000XM5 Wireless Noise Canceling Headphones Silver", "Audio", "$399"],
        ["Nike Air Jordan 1 Retro High OG Chicago", "Footwear", "$180"],
        ["Logitech MX Master 3S Wireless Performance Mouse", "Accessories", "$99"],
        ["Dyson V15 Detect Cordless Vacuum Cleaner Yellow/Nickel", "Home Appliances", "$749"],
        ["Nutella Hazelnut Spread with Cocoa 750g Jar", "Groceries", "$6.99"],
        ["Samsung 65-Inch Class OLED 4K S90C Series Smart TV", "Television", "$1599"],
        ["Nintendo Switch OLED Model with White Joy-Con", "Gaming", "$349"],
        ["Stanley Quencher H2.0 FlowState Stainless Steel Tumbler 40oz", "Kitchen", "$45"],
        ["Ray-Ban Classic Polarized Wayfarer Sunglasses Black", "Eyewear", "$210"]
    ]
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerows(sample_products)
    csv_data = output.getvalue()
    
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sample_products.csv"}
    )

@app.post("/api/export-csv")
def export_csv(payload: ExportRequest):
    """
    Generates and returns the enriched CSV with 'Product Name' in 1st column and 'Image URL' in 2nd column.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    # Format specified by user: Column 1 = Product Name, Column 2 = Image URL, followed by other metadata
    headers = ["Product Name", "Image URL", "Match Score (%)", "Image Title"]
    writer.writerow(headers)

    for item in payload.rows:
        writer.writerow([
            item.get("product_name", ""),
            item.get("image_url", ""),
            item.get("match_score", ""),
            item.get("best_title", "")
        ])

    csv_content = output.getvalue().encode('utf-8-sig')
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=products_with_images.csv"}
    )

# Mount static files
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
