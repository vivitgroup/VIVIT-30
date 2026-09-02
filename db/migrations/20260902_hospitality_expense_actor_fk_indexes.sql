create index if not exists invoices_created_by_idx on hospitality.invoices(created_by) where created_by is not null;
create index if not exists invoice_receipts_created_by_idx on hospitality.invoice_receipts(created_by);
