import os
import json
import pandas as pd
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AI Dashboard Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.post("/api/analyze")
async def analyze_data(file: UploadFile = File(...)):
    try:
        # Read dataset
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file.file)
        elif file.filename.endswith('.json'):
            df = pd.read_json(file.file)
        else:
            raise HTTPException(status_code=400, detail="Only CSV or JSON supported.")

        # Clean NaN values
        df = df.replace([np.inf, -np.inf], np.nan).fillna("")
        
        # Prepare context for OpenAI
        data_summary = {
            "columns": list(df.columns),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "row_count": len(df),
            "sample_rows": df.head(5).to_dict(orient="records")
        }

        # Extract Slicers dynamically
        slicers = {}
        for col in df.columns:
            unique_vals = [str(x) for x in df[col].unique() if str(x).strip() != '']
            if 1 < len(unique_vals) <= 25:
                slicers[col] = sorted(unique_vals)

        prompt = f"""
        You are an expert Data Scientist. Analyze this dataset context:
        {json.dumps(data_summary, default=str)}

        Generate a JSON response containing EXACTLY 20 detailed analytical points about this dataset.
        Format your response ONLY as valid JSON matching this schema:
        {{
            "dashboard_title": "AI Executive Dashboard",
            "explanations": [
                "1. Overview statement...",
                "2. Key metric observation...",
                "3. Trend insight...",
                ... exactly 20 string points numbered 1 to 20 ...
            ]
        }}
        """

        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            ai_data = json.loads(response.choices[0].message.content)
            explanations = ai_data.get("explanations", [])
        except Exception as e:
            # Fallback 20 points if OpenAI API Key is inactive
            explanations = [
                f"{i+1}. Data point analysis generated for dataset containing {len(df)} records across {len(df.columns)} variables."
                for i in range(20)
            ]

        records = df.to_dict(orient="records")

        return {
            "success": True,
            "data": records,
            "columns": list(df.columns),
            "slicers": slicers,
            "explanations": explanations
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)