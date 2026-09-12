const TABS = [{id:'planner',label:'Planner View'},{id:'reasoning',label:'Agent Reasoning'},{id:'rag',label:'RAG Retrieval'},{id:'eval',label:'Eval Scores'}]
export default function Topbar({activeTab,onTabChange,cycleData}) {
  return <header className="topbar">{TABS.map(t=><button key={t.id} className={`tab${activeTab===t.id?' active':''}`} aria-current={activeTab===t.id?'page':undefined} onClick={()=>onTabChange(t.id)}>{t.label}</button>)}<div className="topbar-right"><span className="cycle-pill">{cycleData.cycle.client_name}</span></div></header>
}
