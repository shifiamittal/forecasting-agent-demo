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

  return (
    <div className="shell">
      <Sidebar clients={CLIENTS} selectedClient={selectedClient} onSelectClient={selectClient}
        cycleData={cycleData} onRun={() => selectClient(selectedClient)} />
      <Topbar activeTab={activeTab} onTabChange={selectTab} selectedExc={selectedExc}
        cycleData={cycleData} selectedClient={selectedClient} />
      <main className="main" ref={mainRef}>
        <details className="demo-about">
          <summary>About this prototype <span>Trigger → Observe → Decide → Act → Human Escalation → Learn/Evaluate</span></summary>
          <p><strong>Portfolio demo:</strong> interactive workflow using synthetic fixture data. All companies, products, historical records, metrics, reasoning and evaluation scores are fictional examples. Recommendations and approval states are read-only; no operational actions execute.</p>
          <p><strong>Designed production architecture:</strong> multi-agent orchestration connected to live forecasting data, LLM reasoning, a RAG knowledge layer and downstream operational tools. The reference backend is preserved in source, but is not part of this static deployment. Here, Act means an illustrated reversible step or a proposed action; consequential changes remain subject to human review.</p>
        </details>
        <div className={`panel${activeTab === 'planner' ? ' active' : ''}`}>
          <PlannerPanel cycleData={cycleData} selectedExcId={selectedExcId} onSelectExc={setSelectedExcId} />
        </div>
        <div className={`panel${activeTab === 'reasoning' ? ' active' : ''}`}><ReasoningPanel key={`${selectedClient}-${selectedExcId}`} selectedExc={selectedExc} /></div>
        <div className={`panel${activeTab === 'rag' ? ' active' : ''}`}><RagPanel selectedExc={selectedExc} /></div>
        <div className={`panel${activeTab === 'eval' ? ' active' : ''}`}><EvalPanel selectedExc={selectedExc} /></div>
      </main>
    </div>
  )
}
