from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.parts import router as parts_router
from routes.users import router as users_router
from routes.docs import router as docs_router
from routes.form import router as form_router

app = FastAPI()

print("🚀 Starting FastAPI...")

@app.get("/")
def home():
    return {"message": "FastAPI is running"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ONLY ROUTERS (IMPORTANT)
app.include_router(parts_router)
app.include_router(users_router)
app.include_router(docs_router)
app.include_router(form_router)
