import mariadb from 'mariadb';
const conn = await mariadb.createConnection({
  host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: '2oZ11H5Zrv6DURe.root',
  password: process.env.DBPASS,
  database: 'society_management',
  ssl: { rejectUnauthorized: false },
  connectTimeout: 20000,
});
for (const table of ['Module', 'Permission', 'Role', 'RolePermission', 'User']) {
  const [row] = await conn.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
  console.log(table, row.n.toString());
}
await conn.end();
