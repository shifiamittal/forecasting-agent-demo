export default function Topbar({cycleData}) {
  return <header className="topbar"><span className="tab active">Planner View</span><div className="topbar-right"><span className="cycle-pill">{cycleData.cycle.client_name}</span></div></header>
}
