"""merge heads (004, 004_add_prediction_columns)

Revision ID: 005_merge_heads
Revises: 004, 004_add_prediction_columns
Create Date: 2026-06-07
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '005_merge_heads'
down_revision = ('004', '004_add_prediction_columns')
branch_labels = None
depends_on = None


def upgrade() -> None:
    # merge migration: no schema changes, just unify history
    pass


def downgrade() -> None:
    # nothing to undo; this migration only merges heads
    pass
