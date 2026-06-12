function Dashboard({ rolesMap }) {
  const emps     = useDB(DB.employees)
  const roles    = useDB(DB.roles)
  const tasks    = useDB(DB.tasks)
  const training = useDB(DB.training)

  const stats = [
    { label: 'Employees', value: emps.loading ? '…' : emps.data.length },
    { label: 'Roles',     value: roles.loading ? '…' : roles.data.length },
    { label: 'Tasks',     value: tasks.loading ? '…' : tasks.data.length },
    { label: 'Trainings', value: training.loading ? '…' : training.data.length },
  ]

  // Build roles lookup map
  const rolesLookup = {}
  roles.data.forEach(row => {
    const name = getProp(row.properties, 'Name') || getProp(row.properties, 'Role Name') || getProp(row.properties, 'Title') || ''
    rolesLookup[row.id] = Array.isArray(name) ? name[0] : name
  })

  return (
    <div>
      <div className="section-title">Dashboard</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {stats.map(s => (
          <div key={s.label} className="stat-box">
            <div className="label">{s.label}</div>
            <div className="value">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header"><h2>Recent Employees</h2></div>
        {emps.loading ? <Loading /> : emps.error ? <Err msg={emps.error} /> : (
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Area</th></tr></thead>
            <tbody>
              {emps.data.slice(0,8).map(row => {
                const props   = row.properties
                const name    = getProp(props, 'Name') || 'Unnamed'
                const nameStr = Array.isArray(name) ? name[0] : name
                const roleIds = getProp(props, 'Role') || []
                const roleName = Array.isArray(roleIds) && roleIds.length > 0
                  ? (rolesLookup[roleIds[0]] || roleIds[0])
                  : '—'
                const dept = getProp(props, 'Department') || []
                const deptName = Array.isArray(dept) ? dept.map(d =>
                  typeof d === 'object' ? (d.name || '') : d
                ).filter(Boolean).join(', ') : dept
                const area = getProp(props, 'Area') || []
                const areaName = Array.isArray(area) ? area.map(a =>
                  typeof a === 'object' ? (a.name || '') : a
                ).filter(Boolean).join(', ') : area
                return (
                  <tr key={row.id}>
                    <td><div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <Avatar name={nameStr} />
                      <span style={{ fontWeight:500 }}>{nameStr}</span>
                    </div></td>
                    <td style={{ color:'#4a5568', fontSize:13 }}>{roleName}</td>
                    <td style={{ color:'#718096', fontSize:13 }}>{deptName || '—'}</td>
                    <td style={{ color:'#718096', fontSize:13 }}>{areaName || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
