"""initial schema: parcelles, sensor_readings, predictions

Revision ID: 001
Revises:
Create Date: 2026-06-03
"""
from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "parcelles",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("location", sa.String(200), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("cereal_type", sa.String(50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_table(
        "sensor_readings",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("parcelle_id", sa.Integer(), sa.ForeignKey("parcelles.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("zen_ppb", sa.Float(), nullable=False),
        sa.Column("grain_moisture_pct", sa.Float(), nullable=False),
        sa.Column("temperature_current", sa.Float(), nullable=True),
        sa.Column("humidity_current", sa.Float(), nullable=True),
        sa.Column("temp_mean_24h", sa.Float(), nullable=True),
        sa.Column("humidity_mean_24h", sa.Float(), nullable=True),
        sa.Column("temp_max_24h", sa.Float(), nullable=True),
        sa.Column("temp_min_24h", sa.Float(), nullable=True),
        sa.Column("temp_mean_48h", sa.Float(), nullable=True),
        sa.Column("humidity_mean_48h", sa.Float(), nullable=True),
        sa.Column("temp_max_48h", sa.Float(), nullable=True),
        sa.Column("temp_min_48h", sa.Float(), nullable=True),
        sa.Column("days_since_harvest", sa.Integer(), nullable=True),
        sa.Column(
            "measured_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
            index=True,
        ),
    )

    op.create_table(
        "predictions",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("sensor_reading_id", sa.Integer(), sa.ForeignKey("sensor_readings.id", ondelete="CASCADE"), nullable=False, unique=True, index=True),
        sa.Column("risk_level", sa.String(10), nullable=False),
        sa.Column("risk_score", sa.Float(), nullable=False),
        sa.Column("storage_recommendation", sa.String(10), nullable=False),
        sa.Column("prob_green", sa.Float(), nullable=True),
        sa.Column("prob_orange", sa.Float(), nullable=True),
        sa.Column("prob_red", sa.Float(), nullable=True),
        sa.Column("top_factors", sa.JSON(), nullable=False),
        sa.Column(
            "predicted_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
            index=True,
        ),
    )


def downgrade() -> None:
    op.drop_table("predictions")
    op.drop_table("sensor_readings")
    op.drop_table("parcelles")
