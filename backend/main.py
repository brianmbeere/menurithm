# Entry point for FastAPI backend
from fastapi import FastAPI

app = FastAPI()

@app.get('/')
def read_root():
    return {"message": "Menurithm MVP Backend"}
