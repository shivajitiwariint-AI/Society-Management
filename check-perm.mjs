import mariadb from 'mariadb';
const conn = await mariadb.createConnection({
  host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com', port: 4000,
  user: '2oZ11H5Zrv6DURe.root', password: process.env.DBPASS,
  database: 'society_management', ssl: { rejectUnauthorized: false }, connectTimeout: 20000,
});
const rows = await conn.query(`SELECT r.scopeKey, p.key, rp.dataScope FROM RolePermission rp JOIN Role r ON r.id=rp.roleId JOIN Permission p ON p.id=rp.permissionId WHERE p.key LIKE 'company:society:%' ORDER BY r.scopeKey, p.key`);
console.log(rows);
await conn.end();
