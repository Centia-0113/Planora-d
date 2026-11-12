import {
  BarChart3,
  Bell,
  CalendarDays,
  CheckSquare,
  FileText,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  Settings,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  description: string
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const navSections: NavSection[] = [
  {
    title: 'Plan',
    items: [
      {
        label: 'Dashboard',
        to: '/dashboard',
        icon: LayoutDashboard,
        description: 'Your productivity overview.',
      },
      {
        label: 'My Tasks',
        to: '/tasks',
        icon: CheckSquare,
        description: 'Create, prioritise and complete tasks, with categories and subtasks.',
      },
      {
        label: 'Projects',
        to: '/projects',
        icon: FolderKanban,
        description: 'Group related tasks into projects with milestones and progress tracking.',
      },
      {
        label: 'Monthly Planner',
        to: '/planner',
        icon: CalendarDays,
        description: 'A calendar view of events, task deadlines and project milestones.',
      },
      {
        label: 'Daily Checklist',
        to: '/checklist',
        icon: ListChecks,
        description: 'The activities that need your attention each day.',
      },
    ],
  },
  {
    title: 'Organise',
    items: [
      {
        label: 'Documents',
        to: '/documents',
        icon: FileText,
        description: 'Upload, store and organise project documents securely.',
      },
      {
        label: 'AI Planner',
        to: '/ai-planner',
        icon: Sparkles,
        description: 'Turn a project document into an editable plan and timeline.',
      },
      {
        label: 'Analytics',
        to: '/analytics',
        icon: BarChart3,
        description: 'Charts of your completed work, project progress and weekly patterns.',
      },
    ],
  },
  {
    title: 'Account',
    items: [
      {
        label: 'Notifications',
        to: '/notifications',
        icon: Bell,
        description: 'Deadline reminders and alerts.',
      },
      {
        label: 'Settings',
        to: '/settings',
        icon: Settings,
        description: 'Profile, timezone and notification preferences.',
      },
    ],
  },
]

export const allNavItems = navSections.flatMap((s) => s.items)

export function findNavItem(pathname: string): NavItem | undefined {
  return allNavItems.find((item) => pathname === item.to || pathname.startsWith(item.to + '/'))
}
