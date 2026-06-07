"""drop unused tables, rebuild predictions for lgbm pipeline

Revision ID: 004
Revises: 003_add_model_registry
Create Date: 2026-06-07
"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003_add_model_registry"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table("predictions")
    op.drop_table("imported_records")
    op.drop_table("model_registry")

    op.create_table(
        "predictions",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lon", sa.Float(), nullable=False),
        sa.Column("crop_group", sa.String(50), nullable=False),
        sa.Column("zen_probability", sa.Float(), nullable=False),
        sa.Column("don_probability", sa.Float(), nullable=False),
        sa.Column("afla_probability", sa.Float(), nullable=False),
        sa.Column("contamination_probability", sa.Float(), nullable=False),
        sa.Column("risk_level", sa.String(10), nullable=False),
        sa.Column("weather", sa.JSON(), nullable=False),
        sa.Column(
            "generated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
            index=True,
        ),
    )


def downgrade() -> None:
    op.drop_table("predictions")
