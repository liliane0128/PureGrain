"""replace parcelles/sensor_readings with imported_records

Revision ID: 002
Revises: 001
Create Date: 2026-06-06
"""
from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table("predictions")
    op.drop_table("sensor_readings")
    op.drop_table("parcelles")

    op.create_table(
        "imported_records",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("sample_id", sa.String(100), nullable=True, index=True),
        sa.Column("source_dataset", sa.Text(), nullable=True),
        sa.Column("crop_type", sa.String(255), nullable=True),
        sa.Column("location_country", sa.String(100), nullable=True, index=True),
        sa.Column("location_continent", sa.String(100), nullable=True, index=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=True, index=True),
        sa.Column("sample_year", sa.Integer(), nullable=True, index=True),
        sa.Column("toxin_name", sa.String(150), nullable=True, index=True),
        sa.Column("toxin_value_raw", sa.Text(), nullable=True),
        sa.Column("toxin_unit", sa.String(50), nullable=True),
        sa.Column("toxin_value_standardized_ug_kg", sa.Float(), nullable=True, index=True),
        sa.Column("toxin_detected", sa.Boolean(), nullable=True, index=True),
        sa.Column("fungal_species", sa.String(150), nullable=True, index=True),
        sa.Column("association_type", sa.String(100), nullable=True, index=True),
        sa.Column("original_metadata", sa.Text(), nullable=True),
        sa.Column(
            "imported_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
            index=True,
        ),
    )

    op.create_table(
        "predictions",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column(
            "imported_record_id",
            sa.Integer(),
            sa.ForeignKey("imported_records.id", ondelete="CASCADE"),
            nullable=True,
            index=True,
        ),
        sa.Column("sensor_reading_id", sa.Integer(), nullable=True, index=True),
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
    op.drop_table("imported_records")
