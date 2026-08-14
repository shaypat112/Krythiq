begin;

alter table public.token_requests
  add column if not exists request_type text not null default 'test_tokens'
    check (request_type in ('test_tokens', 'refund')),
  add column if not exists reason text;

alter table public.token_requests
  add constraint token_requests_refund_reason_required
  check (
    request_type = 'test_tokens' or
    (reason is not null and char_length(btrim(reason)) between 10 and 1000)
  ) not valid;

alter table public.token_requests
  validate constraint token_requests_refund_reason_required;

create or replace function public.review_token_request(
  request_id uuid,
  reviewer_id uuid,
  decision text
)
returns public.token_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewed_request public.token_requests%rowtype;
begin
  if decision not in ('approved', 'rejected') then
    raise exception 'Invalid token request decision';
  end if;

  select * into reviewed_request
  from public.token_requests
  where id = request_id
  for update;

  if not found then raise exception 'Token request not found'; end if;
  if reviewed_request.status <> 'pending' then
    raise exception 'Token request was already reviewed';
  end if;

  update public.token_requests
  set status = decision, reviewed_by = reviewer_id, reviewed_at = now()
  where id = request_id
  returning * into reviewed_request;

  if decision = 'approved' then
    insert into public.token_transactions (
      user_id, amount, transaction_type, description, idempotency_key
    ) values (
      reviewed_request.user_id,
      reviewed_request.amount,
      case when reviewed_request.request_type = 'refund' then 'refund' else 'admin_adjustment' end,
      case when reviewed_request.request_type = 'refund'
        then 'Approved Token refund request'
        else 'Admin-approved test Token request'
      end,
      'token-request:' || reviewed_request.id::text
    ) on conflict (idempotency_key) do nothing;
  end if;

  return reviewed_request;
end;
$$;

revoke all on function public.review_token_request(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.review_token_request(uuid, uuid, text)
  to service_role;

commit;
