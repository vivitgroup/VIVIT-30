import postgres from "postgres";

const dbUrl=String(process.env.DATABASE_URL||"");
if(!dbUrl)throw new Error("DATABASE_URL required");
const sql=postgres(dbUrl,{ssl:false,prepare:false,max:1});
const expected={
  clients:["facebook_url","instagram_url"],
  creative_tasks:["archived_at","archived_by","deleted_at","deleted_by"],
  file_documents:["archived_at","archived_by"],
  ad_campaigns:["archived_at","reported_result_label","reported_result_type"],
  ad_performance_daily:["add_to_cart"],
};
let passed=0,total=0;
try{
  for(const [table,columns] of Object.entries(expected)){
    for(const column of columns){
      total++;
      const rows=await sql`
        select data_type,is_nullable,column_default
        from information_schema.columns
        where table_schema='public' and table_name=${table} and column_name=${column}
      `;
      const ok=rows.length===1;
      console.log(`${ok?"PASS":"FAIL"}  ${table}.${column} exists in fresh runtime schema`);
      if(ok)passed++;
    }
  }
  total++;
  const atc=await sql`
    select is_nullable,column_default
    from information_schema.columns
    where table_schema='public' and table_name='ad_performance_daily' and column_name='add_to_cart'
  `;
  const atcSafe=atc.length===1&&atc[0].is_nullable==='NO'&&String(atc[0].column_default||'').includes('0');
  console.log(`${atcSafe?"PASS":"FAIL"}  ad_performance_daily.add_to_cart is non-null with zero default`);
  if(atcSafe)passed++;
  console.log(`\n${passed}/${total} Client Portal schema-contract checks passed.`);
  if(passed!==total)process.exit(1);
}finally{await sql.end({timeout:1});}
