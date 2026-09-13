import { useEffect, useRef, useState } from 'react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import PlannerPanel from './components/panels/PlannerPanel'
import ExceptionDetails from './components/panels/ExceptionDetails'
import ReasoningPanel from './components/panels/ReasoningPanel'
import RagPanel from './components/panels/RagPanel'
import EvalPanel from './components/panels/EvalPanel'
import velora from './data/velora.json'
import nuvora from './data/nuvora.json'
import terralune from './data/terralune.json'
import './App.css'

const SCENARIOS = { VELORA: velora, NUVORA: nuvora, TERRALUNE: terralune }
const CLIENTS = Object.values(SCENARIOS).map(({cycle}) => ({id:cycle.client_id,name:cycle.client_name}))
const ROUTES = {
  '/exceptions/missing-retail-data':['VELORA','exc-1'],
  '/exceptions/seasonal-underforecast':['VELORA','exc-2'],
  '/exceptions/planned-seasonal-event':['VELORA','exc-3'],
  '/exceptions/missing-materials-data':['NUVORA','exc-1'],
  '/exceptions/project-underforecast':['NUVORA','exc-2'],
  '/exceptions/planned-materials-event':['NUVORA','exc-3'],
  '/exceptions/missing-fleet-data':['TERRALUNE','exc-1'],
  '/exceptions/fleet-underforecast':['TERRALUNE','exc-2'],
  '/exceptions/planned-fleet-event':['TERRALUNE','exc-3'],
}
function readLocation() {
  const params = new URLSearchParams(window.location.search)
  const match = ROUTES[window.location.pathname.replace(/\/$/,'')]
  const client = match?.[0] ?? (SCENARIOS[params.get('client')] ? params.get('client') : 'VELORA')
  const view = params.get('view')
  return {client,exception:match?.[1] ?? null,tab:['reasoning','rag','eval'].includes(view) ? view : 'planner'}
}
export default function App() {
  const [route,setRoute] = useState(readLocation)
  const mainRef=useRef(null)
  const cycleData=SCENARIOS[route.client]
  const selectedExc=cycleData.exceptions.find(e=>e.id===route.exception) ?? null
  useEffect(()=>{const pop=()=>setRoute(readLocation());window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop)},[])
  useEffect(()=>{mainRef.current?.scrollTo(0,0)},[route])
  function navigate(client,exception=null,tab='planner') {
    const path=exception ? Object.keys(ROUTES).find(path=>ROUTES[path][0]===client&&ROUTES[path][1]===exception) : '/'
    const params=new URLSearchParams()
    if(!exception&&client!=='VELORA')params.set('client',client)
    if(tab!=='planner')params.set('view',tab)
    const url=path+(params.size?'?'+params.toString():'')
    if(window.location.pathname+window.location.search!==url)window.history.pushState({},'',url)
    setRoute({client,exception,tab})
  }
  const back=()=>navigate(route.client)
  return <div className="shell">
    <Sidebar clients={CLIENTS} selectedClient={route.client} onSelectClient={client=>navigate(client)} cycleData={cycleData}/>
    <Topbar activeTab={route.tab} onTabChange={tab=>navigate(route.client,route.exception,tab)} cycleData={cycleData}/>
    <main className="main" ref={mainRef}>
      <div className={`panel${route.tab==='planner'&&!selectedExc?' active':''}`}><PlannerPanel cycleData={cycleData} selectedExcId={null} onSelectExc={id=>{if(id)navigate(route.client,id)}}/></div>
      {selectedExc && route.tab==='planner' && <div className="panel active"><ExceptionDetails key={`${route.client}-${route.exception}`} exception={selectedExc} cycleData={cycleData} onBack={back} onPrecedent={()=>navigate(route.client,route.exception,'rag')}/></div>}
      {selectedExc && route.tab!=='planner' && <button className="detail-back supporting-back" onClick={back}>← Back to Forecast Review</button>}
      <div className={`panel${route.tab==='reasoning'?' active':''}`}><ReasoningPanel key={`${route.client}-${route.exception}`} selectedExc={selectedExc}/></div>
      <div className={`panel${route.tab==='rag'?' active':''}`}><RagPanel key={`${route.client}-${route.exception}`} selectedExc={selectedExc}/></div>
      <div className={`panel${route.tab==='eval'?' active':''}`}><EvalPanel key={`${route.client}-${route.exception}`} selectedExc={selectedExc}/></div>
    </main>
  </div>
}
