import { PlannedTab, tabMetadata } from '../../../components/planned';

export const metadata = tabMetadata('projects');

export default function ProjectsPage() {
  return <PlannedTab id="projects" />;
}
