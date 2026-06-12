import React, { useState, useEffect } from 'react'

const DB = {
  employees:   '1213bc48-187d-8057-8f6d-f3fee68c2570',
  roles:       '1213bc48-187d-8030-aecf-e38042dc0bb3',
  jobDesc:     '2133bc48-187d-804e-b9f7-cbfe5d4d758d',
  tasks:       '5dc7135d-3896-4592-8a12-efd44943826e',
  skills:      '8aa58426-b75a-4986-a334-2d6bd3d2a69a',
  training:    '9ee4e81e-a6d2-455a-b5e0-23f1923b1930',
}

async function queryDB(dbId, body = {}) {
  const res = await fetch(`/api/notion?endpoint=databases/${dbId}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const data = await res.json()
  return data.results || []
}

async function getPage(pageId) {
  const res = await fetch(`/api/notion?endpoint=pages/${pageId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  if (!res.ok) return null
  return res.json()
}

function getProp(props, name) {
  const p = props[name]
  if (!p) return ''
  switch (p.type) {
    case 'title':        return p.title.map(t => t.plain_text).join('')
    case 'rich_text':    return p.rich_text.map(t => t.plain_text).join('')
    case 'select':       return p.select?.name || ''
    case 'multi_select': return p.multi_select.map(s => s.name)
    case 'number':       return p.number ?? ''
    case 'checkbox':     return p.checkbox
    case 'date':         return p.date?.start || ''
    case 'people':       return p.people.map(u => u.name || u.id)
    case 'relation':     return p.relation.map(r => r.id)
    case 'rollup':
      if (p.rollup.type === 'array')
        return p.rollup.array.map(item => {
          if (item.type === 'title')        return item.title.map(t => t.plain_text).join('')
          if (item.type === 'rich_text')    return item.rich_text.map(t => t.plain_text).join('')
          if (item.type === 'multi_select') return item.multi_select.map(s => s.name).join(', ')
          if (item.type === 'number')       return item.number
          return ''
        }).filter(Boolean)
      if (p.rollup.type === 'number') return p.rollup.number
      return ''
    default: return ''
  }
}

const pageCache = {}
async function resolveId(id) {
  if (!id) return ''
  if (pageCache[id]) return pageCache[id]
  try {
    const page = await getPage(id)
    if (!page) return id
    const props = page.properties
    const titleProp = Object.values(props).find(p => p.type === 'title')
    const name = titleProp ? titleProp.title.map(t => t.plain_text).join('') : id
    pageCache[id] = name
    return name
  } catch { return id }
}

async function resolveIds(ids) {
  if (!ids || ids.length === 0) return []
  const names = await Promise.all(ids.map(resolveId))
  return names.filter(Boolean)
}

function useDB(dbId) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  useEffect(() => {
    queryDB(dbId)
      .then(rows => { setData(rows); setLoading(false) })
      .catch(e   => { setError(e.message); setLoading(false) })
  }, [dbId])
  return { data, loading, error }
}

function useRoleMap() {
  const [roleMap, setRoleMap] = useState({})
  useEffect(() => {
    queryDB(DB.roles).then(rows => {
      const map = {}
      rows.forEach(row => {
        const name = getProp(row.properties, 'Name') || getProp(row.properties, 'Role Name') || getProp(row.properties, 'Title') || ''
        if (name) map[row.id] = name
      })
      Object.assign(pageCache, map)
      setRoleMap(map)
    }).catch(() => {})
  }, [])
  return roleMap
}

function Loading() { return <div className="loading">Loading…</div> }
function Err({ msg }) { return <div className="error">Error: {msg}</div> }

function Avatar({ name }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : '?'
  const colors = ['#7c85f5','#48bb78','#ed8936','#e53e3e','#38b2ac','#805ad5']
  const bg = colors[(name?.charCodeAt(0) || 0) % colors.length]
  return <div className="avatar" style={{ background: bg }}>{initials}</div>
}

function ProgressBar({ value = 0, max = 100 }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div>
      <div className="progress-wrap">
        <div className="progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <div style={{ fontSize: 11, color: '#718096', marginTop: 2 }}>{pct}%</div>
    </div>
  )
}

function statusBadge(status) {
  if (!status) return <span className="badge badge-gray">—</span>
  const s = status.toLowerCase()
  if (s.includes('active') || s.includes('complete') || s.includes('done'))
    return <span className="badge badge-green">{status}</span>
  if (s.includes('progress') || s.includes('ongoing'))
    return <span className="badge badge-blue">{status}</span>
  if (s.includes('pending') || s.includes('assigned'))
    return <span className="badge badge-yellow">{status}</span>
  if (s.includes('inactive') || s.includes('overdue'))
    return <span className="badge badge-red">{status}</span>
  return <span className="badge badge-gray">{status}</span>
}

function RelationCell({ ids }) {
  const [names, setNames] = useState(null)
  useEffect(() => {
    if (!ids || ids.length === 0) { setNames([]); return }
    resolveIds(ids).then(setNames)
  }, [ids?.join(',')])
  if (names === null) return <span style={{ color:'#a0aec0', fontSize:12 }}>…</span>
  if (names.length === 0) return <span style={{ color:'#a0aec0' }}>—</span>
  return <span>{names.join(', ')}</span>
}

function Dashboard() {
  const emps     = useDB(DB.employees)
  const roles    = useDB(DB.roles)
  const tasks    = useDB(DB.tasks)
  const training = useDB(DB.training)
  useRoleMap()

  const stats = [
    { label: 'Employees', value: emps.loading ? '…' : emps.data.length },
    { label: 'Roles',     value: roles.loading ? '…' : roles.data.length },
    { label: 'Tasks',     value: tasks.loading ? '…' : tasks.data.length },
    { label: 'Trainings', value: training.loading ? '…' : training.data.length },
  ]

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
              {emps.data.filter(r => {
                const n = getProp(r.properties, 'Name') || ''
                return n && n !== 'Employee Template'
              }).slice(0,8).map(row => {
                const props   = row.properties
                const name    = getProp(props, 'Name') || 'Unnamed'
                const roleIds = getProp(props, 'Role') || []
                const dept    = getProp(props, 'Department') || []
                const area    = getProp(props, 'Area') || []
                const nameStr = Array.isArray(name) ? name[0] : name
                return (
                  <tr key={row.id}>
                    <td><div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <Avatar name={nameStr} />
                      <span style={{ fontWeight:500 }}>{nameStr}</span>
                    </div></td>
                    <td style={{ color:'#4a5568', fontSize:13 }}>
                      <RelationCell ids={Array.isArray(roleIds) ? roleIds : [roleIds].filter(Boolean)} />
                    </td>
                    <td style={{ color:'#718096', fontSize:13 }}>{Array.isArray(dept) ? dept.join(', ') : dept}</td>
                    <td style={{ color:'#718096', fontSize:13 }}>{Array.isArray(area) ? area.join(', ') : area}</td>
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

function Employees() {
  const { data, loading, error } = useDB(DB.employees)
  const [search, setSearch] = useState('')
  useRoleMap()

  if (loading) return <Loading />
  if (error)   return <Err msg={error} />

  const filtered = data.filter(row => {
    const name = getProp(row.properties, 'Name') || ''
    const n = Array.isArray(name) ? name.join(' ') : name
    return n && n !== 'Employee Template' && n.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div className="section-title" style={{ marginBottom:0 }}>Employees ({filtered.length})</div>
        <input
          style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:14, width:240 }}
          placeholder="Search employees…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="grid-3">
        {filtered.map(row => {
          const props   = row.properties
          const name    = getProp(props, 'Name') || 'Unnamed'
          const roleIds = getProp(props, 'Role') || []
          const dept    = getProp(props, 'Department') || []
          const area    = getProp(props, 'Area') || []
          const nameStr = Array.isArray(name) ? name[0] : name
          return (
            <div key={row.id} className="emp-card">
              <div className="emp-header">
                <Avatar name={nameStr} />
                <div>
                  <div className="emp-name">{nameStr}</div>
                  <div className="emp-role">
                    <RelationCell ids={Array.isArray(roleIds) ? roleIds : [roleIds].filter(Boolean)} />
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
                {(Array.isArray(dept) ? dept : [dept]).filter(Boolean).map(d =>
                  <span key={d} className="skill-tag">{d}</span>
                )}
                {(Array.isArray(area) ? area : [area]).filter(Boolean).map(a =>
                  <span key={a} className="skill-tag" style={{ background:'#e6fffa', color:'#2c7a7b' }}>{a}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Roles() {
  const { data, loading, error } = useDB(DB.roles)
  if (loading) return <Loading />
  if (error)   return <Err msg={error} />
  return (
    <div>
      <div className="section-title">Roles ({data.length})</div>
      <div className="card">
        <table>
          <thead><tr><th>Role</th><th>Department</th><th>Seniority</th><th>Area</th></tr></thead>
          <tbody>
            {data.map(row => {
              const props     = row.properties
              const name      = getProp(props, 'Name') || getProp(props, 'Role Name') || getProp(props, 'Title') || 'Unnamed'
              const dept      = getProp(props, 'Department') || getProp(props, 'Team') || []
              const seniority = getProp(props, 'Seniority') || getProp(props, 'Level') || ''
              const area      = getProp(props, 'Area') || ''
              return (
                <tr key={row.id}>
                  <td style={{ fontWeight:500 }}>{Array.isArray(name) ? name[0] : name}</td>
                  <td>{Array.isArray(dept) ? dept.join(', ') : dept}</td>
                  <td>{Array.isArray(seniority) ? seniority.join(', ') : seniority}</td>
                  <td>{Array.isArray(area) ? area.join(', ') : area}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SkillsMatrix() {
  const { data, loading, error } = useDB(DB.skills)
  if (loading) return <Loading />
  if (error)   return <Err msg={error} />
  return (
    <div>
      <div className="section-title">Skills Matrix ({data.length})</div>
      <div className="card">
        <table>
          <thead><tr><th>Skill</th><th>Category</th><th>Area</th><th>Status</th></tr></thead>
          <tbody>
            {data.map(row => {
              const props    = row.properties
              const name     = getProp(props, 'Name') || getProp(props, 'Skill') || getProp(props, 'Title') || 'Unnamed'
              const category = getProp(props, 'Category') || getProp(props, 'Type') || ''
              const area     = getProp(props, 'Area') || getProp(props, 'Department') || ''
              const status   = getProp(props, 'Status') || ''
              return (
                <tr key={row.id}>
                  <td style={{ fontWeight:500 }}>{Array.isArray(name) ? name[0] : name}</td>
                  <td>{Array.isArray(category) ? category.join(', ') : category}</td>
                  <td>{Array.isArray(area) ? area.join(', ') : area}</td>
                  <td>{statusBadge(Array.isArray(status) ? status[0] : status)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Tasks() {
  const { data, loading, error } = useDB(DB.tasks)
  const [filter, setFilter] = useState('All')
  if (loading) return <Loading />
  if (error)   return <Err msg={error} />

  const statuses = ['All', ...new Set(data.map(r => {
    const s = getProp(r.properties, 'Status') || getProp(r.properties, 'Task Status') || ''
    return Array.isArray(s) ? s[0] : s
  }).filter(Boolean))]

  const filtered = filter === 'All' ? data : data.filter(r => {
    const s = getProp(r.properties, 'Status') || getProp(r.properties, 'Task Status') || ''
    return (Array.isArray(s) ? s[0] : s) === filter
  })

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div className="section-title" style={{ marginBottom:0 }}>Tasks ({data.length})</div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {statuses.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{
                padding:'6px 14px', borderRadius:20, border:'1px solid #e2e8f0',
                background: filter===s ? '#1a1f36' : 'white',
                color: filter===s ? 'white' : '#4a5568',
                cursor:'pointer', fontSize:13, fontWeight:500
              }}>{s}</button>
          ))}
        </div>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Task</th><th>Category</th><th>Area</th><th>Priority</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map(row => {
              const props    = row.properties
              const name     = getProp(props, 'Name') || getProp(props, 'Task Name') || getProp(props, 'Title') || 'Unnamed'
              const category = getProp(props, 'Category') || getProp(props, 'Type') || ''
              const area     = getProp(props, 'Area') || ''
              const priority = getProp(props, 'Priority') || ''
              const status   = getProp(props, 'Status') || getProp(props, 'Task Status') || ''
              return (
                <tr key={row.id}>
                  <td style={{ fontWeight:500 }}>{Array.isArray(name) ? name[0] : name}</td>
                  <td>{Array.isArray(category) ? category.join(', ') : category}</td>
                  <td>{Array.isArray(area) ? area.join(', ') : area}</td>
                  <td>{statusBadge(Array.isArray(priority) ? priority[0] : priority)}</td>
                  <td>{statusBadge(Array.isArray(status) ? status[0] : status)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Training() {
  const { data, loading, error } = useDB(DB.training)
  if (loading) return <Loading />
  if (error)   return <Err msg={error} />
  return (
    <div>
      <div className="section-title">Training Assignments ({data.length})</div>
      <div className="card">
        <table>
          <thead><tr><th>Training</th><th>Assignee</th><th>Due Date</th><th>Progress</th><th>Status</th></tr></thead>
          <tbody>
            {data.map(row => {
              const props       = row.properties
              const name        = getProp(props, 'Name') || getProp(props, 'Training') || getProp(props, 'Title') || 'Unnamed'
              const assigneeIds = getProp(props, 'Assignee') || getProp(props, 'Employee') || getProp(props, 'Assigned To') || []
              const due         = getProp(props, 'Due Date') || getProp(props, 'Deadline') || ''
              const progress    = getProp(props, 'Progress') || getProp(props, 'Completion') || 0
              const status      = getProp(props, 'Status') || ''
              return (
                <tr key={row.id}>
                  <td style={{ fontWeight:500 }}>{Array.isArray(name) ? name[0] : name}</td>
                  <td style={{ color:'#718096', fontSize:13 }}>
                    {Array.isArray(assigneeIds) ? <RelationCell ids={assigneeIds} /> : assigneeIds}
                  </td>
                  <td style={{ color:'#718096', fontSize:13 }}>{due || '—'}</td>
                  <td style={{ minWidth:120 }}>
                    {typeof progress === 'number' ? <ProgressBar value={progress} /> : progress || '—'}
                  </td>
                  <td>{statusBadge(Array.isArray(status) ? status[0] : status)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const TABS = ['Dashboard','Employees','Roles','Skills Matrix','Tasks','Training']

export default function App() {
  const [tab, setTab] = useState('Dashboard')
  return (
    <div className="app">
      <header className="header">
        <h1>Ops<span>Nest</span></h1>
        <nav className="nav">
          {TABS.map(t => (
            <button key={t} className={tab===t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
          ))}
        </nav>
      </header>
      <main className="content">
        {tab === 'Dashboard'     && <Dashboard />}
        {tab === 'Employees'     && <Employees />}
        {tab === 'Roles'         && <Roles />}
        {tab === 'Skills Matrix' && <SkillsMatrix />}
        {tab === 'Tasks'         && <Tasks />}
        {tab === 'Training'      && <Training />}
      </main>
    </div>
  )
}
