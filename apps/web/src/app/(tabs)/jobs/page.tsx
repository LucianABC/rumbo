import { PlannedTab, tabMetadata } from '../../../components/planned';

export const metadata = tabMetadata('jobs');

export default function JobsPage() {
  return <PlannedTab id="jobs" />;
}
