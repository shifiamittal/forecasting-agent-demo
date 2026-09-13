import ForecastReviewLanding from './ForecastReviewLanding'
export default function PlannerPanel({cycleData,selectedExcId,onSelectExc}) {
  return <ForecastReviewLanding key={cycleData.cycle.client_id} cycleData={cycleData} selectedExcId={selectedExcId} onSelectExc={onSelectExc}/>
}
