"""add new prediction columns (lat/lon, toxins, weather)

Revision ID: 004_add_prediction_columns
Revises: 003_add_model_registry
Create Date: 2026-06-07
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '004_add_prediction_columns'
down_revision = '003_add_model_registry'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # add new columns used by the newer Prediction model
    op.add_column('predictions', sa.Column('lat', sa.Float(), nullable=True))
    op.add_column('predictions', sa.Column('lon', sa.Float(), nullable=True))
    op.add_column('predictions', sa.Column('crop_group', sa.String(length=50), nullable=True))
    op.add_column('predictions', sa.Column('zen_probability', sa.Float(), nullable=True))
    op.add_column('predictions', sa.Column('don_probability', sa.Float(), nullable=True))
    op.add_column('predictions', sa.Column('afla_probability', sa.Float(), nullable=True))
    op.add_column('predictions', sa.Column('contamination_probability', sa.Float(), nullable=True))
    op.add_column('predictions', sa.Column('weather', sa.JSON(), nullable=True))
    op.add_column('predictions', sa.Column('generated_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('predictions', 'generated_at')
    op.drop_column('predictions', 'weather')
    op.drop_column('predictions', 'contamination_probability')
    op.drop_column('predictions', 'afla_probability')
    op.drop_column('predictions', 'don_probability')
    op.drop_column('predictions', 'zen_probability')
    op.drop_column('predictions', 'crop_group')
    op.drop_column('predictions', 'lon')
    op.drop_column('predictions', 'lat')
