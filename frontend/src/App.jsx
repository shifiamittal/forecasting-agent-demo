import { useState, useRef } from 'react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import PlannerPanel from './components/panels/PlannerPanel'
import ReasoningPanel from './components/panels/ReasoningPanel'
import RagPanel from './components/panels/RagPanel'
import EvalPanel from './components/panels/EvalPanel'
import velora from './data/velora.json'
import nuvora from './data/nuvora.json'
import terralune from './data/terralune.json'
import './App.css'

const SCENARIOS = { VELORA: velora, NUVORA: nuvora, TERRALUNE: terralune }
const CLIENTS = Object.values(SCENARIOS).map(({ cycle }) => ({
  id: cycle.client_id, name: cycle.client_name, cycle: cycle.cycle_id,
}))

export default function App() {
  const [selectedClient, setSelectedClient] = useState('VELORA')
  const [selectedExcId, setSelectedExcId] = useState(null)
  const [activeTab, setActiveTab] = useState('planner')
  const mainRef = useRef(null)
  const cycleData = SCENARIOS[selectedClient]
  const selectedExc = cycleData.exceptions.find(e => e.id === selectedExcId) ?? null

  function selectClient(id) {
    setSelectedClient(id)
    setSelectedExcId(null)
    setActiveTab('planner')
    mainRef.current?.scrollTo(0, 0)
  }
  function selectTab(id) {
    setActiveTab(id)
    mainRef.current?.scrollTo(0, 0)
  }


  function selectException(id) {
    setSelectedExcId(id)
  }

  return (
    <div className="shell">
      <Sidebar clients={CLIENTS} selectedClient={selectedClient} onSelectClient={selectClient}
        cycleData={cycleData} />
      <Topbar activeTab={activeTab} onTabChange={selectTab} selectedExc={selectedExc}
        cycleData={cycleData} selectedClient={selectedClient} />
      <main className="main" ref={mainRef}>
        <div className={`panel${activeTab === 'planner' ? ' active' : ''}`}>
          <PlannerPanel cycleData={cycleData} selectedExcId={selectedExcId} onSelectExc={selectException} />
        </div>
        <div className={`panel${activeTab === 'reasoning' ? ' active' : ''}`}><ReasoningPanel key={`${selectedClient}-${selectedExcId}`} selectedExc={selectedExc} /></div>
        <div className={`panel${activeTab === 'rag' ? ' active' : ''}`}><RagPanel key={`${selectedClient}-${selectedExcId}`} selectedExc={selectedExc} /></div>
        <div className={`panel${activeTab === 'eval' ? ' active' : ''}`}><EvalPanel key={`${selectedClient}-${selectedExcId}`} selectedExc={selectedExc} /></div>
      </main>
    </div>
  )
}
