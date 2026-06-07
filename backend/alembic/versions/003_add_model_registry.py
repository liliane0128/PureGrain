"""add model_registry table

Revision ID: 003_add_model_registry
Revises: 002_import_records_schema
Create Date: 2026-06-07 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003_add_model_registry'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'model_registry',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('strain', sa.String(length=128), nullable=False, unique=True),
        sa.Column('weight_path', sa.String(length=512), nullable=False),
        sa.Column('accuracy', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('model_registry')
