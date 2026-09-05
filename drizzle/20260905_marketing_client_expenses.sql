create table if not exists client_expenses (
  id text primary key,
  workspace_id text not null,
  client_id text not null references clients(id) on delete restrict,
  category text not null,
  description text not null,
  amount numeric(18,2) not null check (amount > 0),
  currency text not null default 'EGP',
  expense_date timestamptz not null default now(),
  receipt_url text,
  created_by text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_client_expenses_workspace_client_date
  on client_expenses(workspace_id, client_id, expense_date desc)
  where archived_at is null;
