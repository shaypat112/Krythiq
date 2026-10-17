insert into auth.users values ('11111111-1111-4111-8111-111111111111');
insert into public.cli_device_codes(device_code_hash,user_code,expires_at,terminal_name,session_version) values(repeat('d',64),'ABCD-EFGH',now()+interval '10 minutes','Fixture laptop',2);
do $$
declare v_status text; v_id uuid; v_count bigint; v_used bigint;
begin
  select status into v_status from public.claim_cli_device(repeat('d',64),repeat('a',64),repeat('b',64));
  if v_status <> 'authorization_pending' then raise exception 'pending code issued a credential'; end if;
  update public.cli_device_codes set user_id='11111111-1111-4111-8111-111111111111',status='approved' where user_code='ABCD-EFGH';
  select status,token_id into v_status,v_id from public.claim_cli_device(repeat('d',64),repeat('a',64),repeat('b',64));
  if v_status <> 'ok' or v_id is null then raise exception 'approved claim failed'; end if;
  if (select name from public.cli_access_tokens where id=v_id) <> 'Fixture laptop' then raise exception 'terminal name lost'; end if;
  select status into v_status from public.claim_cli_device(repeat('d',64),repeat('c',64),repeat('e',64));
  if v_status <> 'already_consumed' or (select count(*) from public.cli_access_tokens) <> 1 then raise exception 'device code replay issued a second session'; end if;
  if (select count(*) from public.authenticate_cli_session(repeat('a',64))) <> 1 then raise exception 'initial access rejected'; end if;
  update public.cli_access_tokens set expires_at=now()-interval '1 second' where id=v_id;
  if (select count(*) from public.authenticate_cli_session(repeat('a',64))) <> 0 then raise exception 'expired access accepted'; end if;
  perform * from public.refresh_cli_session(repeat('b',64),repeat('c',64));
  perform * from public.refresh_cli_session(repeat('b',64),repeat('e',64));
  if (select count(*) from public.authenticate_cli_session(repeat('c',64))) <> 1 or (select count(*) from public.authenticate_cli_session(repeat('e',64))) <> 1 then raise exception 'overlapping refresh credentials rejected'; end if;
  insert into public.cli_scan_events(user_id,cli_token_id,repository,issues,token_cost) select '11111111-1111-4111-8111-111111111111',v_id,'owner/repo',1,1 from generate_series(1,1101);
  select scan_count,tokens_used into v_count,v_used from public.cli_usage_summary('11111111-1111-4111-8111-111111111111');
  if v_count <> 1101 or v_used <> 1101 then raise exception 'CLI usage truncated'; end if;
  update public.cli_access_tokens set refresh_expires_at=now()-interval '1 second' where id=v_id;
  if (select count(*) from public.authenticate_cli_session(repeat('c',64))) <> 0 or (select count(*) from public.refresh_cli_session(repeat('b',64),repeat('0',64))) <> 0 then raise exception 'hard expiry did not close authorization'; end if;
  update public.cli_access_tokens set refresh_expires_at=now()+interval '1 day' where id=v_id;
  perform * from public.revoke_cli_session(null,repeat('b',64));
  if (select count(*) from public.authenticate_cli_session(repeat('c',64))) <> 0 or (select count(*) from public.refresh_cli_session(repeat('b',64),repeat('f',64))) <> 0 then raise exception 'revocation did not invalidate family'; end if;
  insert into public.cli_access_tokens(user_id,token_hash) values('11111111-1111-4111-8111-111111111111',repeat('f',64));
  if (select count(*) from public.authenticate_cli_session(repeat('f',64))) <> 1 then raise exception 'legacy credential rejected'; end if;
  if has_column_privilege('authenticated','public.cli_access_tokens','token_hash','SELECT') then raise exception 'browser can read credential hash'; end if;
  if has_table_privilege('authenticated','public.cli_access_tokens','UPDATE') then raise exception 'browser can restore revoked session'; end if;
  if has_function_privilege('authenticated','public.refresh_cli_session(text,text)','EXECUTE') then raise exception 'browser can execute service refresh RPC'; end if;
end;
$$;

-- A failed insert must not burn the approved authorization code.
insert into public.cli_device_codes(device_code_hash,user_code,user_id,status,expires_at) values(repeat('9',64),'WXYZ-QRST','11111111-1111-4111-8111-111111111111','approved',now()+interval '10 minutes');
do $$
begin
  begin
    perform * from public.claim_cli_device(repeat('9',64),'bad-hash',repeat('8',64));
    raise exception 'expected invalid token constraint';
  exception when check_violation then null;
  end;
  if (select status from public.cli_device_codes where user_code='WXYZ-QRST') <> 'approved' then raise exception 'failed exchange consumed approval'; end if;
end;
$$;
select 'CLI database lifecycle assertions passed' as result;

-- An older published CLI does not understand refresh credentials. Its newly
-- authorized access lasts 90 days rather than silently breaking after an hour.
insert into public.cli_device_codes(device_code_hash,user_code,user_id,status,expires_at) values(repeat('4',64),'LMNO-PQRS','11111111-1111-4111-8111-111111111111','approved',now()+interval '10 minutes');
do $$
declare v_exp timestamptz; v_refresh timestamptz;
begin
  select expires_at,refresh_expires_at into v_exp,v_refresh from public.claim_cli_device(repeat('4',64),repeat('3',64),repeat('2',64));
  if v_exp < now()+interval '89 days' or v_refresh is not null then raise exception 'older CLI compatibility failed'; end if;
end;
$$;
