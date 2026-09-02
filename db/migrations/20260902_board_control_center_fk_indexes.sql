create index if not exists idx_board_actions_created_by on vgroup.board_action_items(created_by);
create index if not exists idx_board_decisions_created_by on vgroup.board_decisions(created_by);
create index if not exists idx_board_decisions_decided_by on vgroup.board_decisions(decided_by);
