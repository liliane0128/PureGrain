from pydantic import BaseModel


class BatchPredictionItem(BaseModel):
    row_index: int
    zen_probability: float
    risk_level: str  # GREEN / ORANGE / RED


class BatchPredictionResponse(BaseModel):
    total: int
    detected_count: int
    risk_summary: dict[str, int]
    model_roc_auc: float
    predictions: list[BatchPredictionItem]
