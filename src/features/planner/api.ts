import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/query'
import type { ChecklistItem, EventCategory, PlannerEvent } from '@/types/database'
import { useWorkspace } from '@/features/workspace/workspace-context'
import { keys as taskKeys } from '@/features/tasks/api'

export const plannerKeys = {
  events: (ws: string, from: string, to: string) => ['ws', ws, 'events', from, to] as const,
  checklist: (ws: string, date: string) => ['ws', ws, 'checklist', date] as const,
}

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  personal: 'Personal',
  academic: 'Academic',
  work: 'Work',
  meeting: 'Meeting',
  deadline: 'Deadline',
  other: 'Other',
}

export type EventInput = Pick<
  PlannerEvent,
  'title' | 'description' | 'event_date' | 'start_time' | 'end_time' | 'category'
>

export function useEvents(from: string, to: string) {
  const { workspaceId } = useWorkspace()
  return useQuery({
    queryKey: plannerKeys.events(workspaceId, from, to),
    queryFn: async () =>
      unwrap<PlannerEvent[]>(
        await supabase
          .from('planner_events')
          .select('*')
          .eq('workspace_id', workspaceId)
          .gte('event_date', from)
          .lte('event_date', to)
          .order('event_date')
          .order('start_time', { ascending: true, nullsFirst: true }),
      ),
  })
}

function useInvalidate() {
  const qc = useQueryClient()
  const { workspaceId } = useWorkspace()
  return () => qc.invalidateQueries({ queryKey: taskKeys.all(workspaceId) })
}

export function useSaveEvent() {
  const { workspaceId } = useWorkspace()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: EventInput }) =>
      id
        ? unwrap<PlannerEvent>(
            await supabase.from('planner_events').update(input).eq('id', id).select().single(),
          )
        : unwrap<PlannerEvent>(
            await supabase
              .from('planner_events')
              .insert({ ...input, workspace_id: workspaceId })
              .select()
              .single(),
          ),
    onSuccess: invalidate,
  })
}

export function useDeleteEvent() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('planner_events').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

// ---------------------------------------------------------------------------
// Daily checklist
// ---------------------------------------------------------------------------

export function useChecklist(date: string) {
  const { workspaceId } = useWorkspace()
  return useQuery({
    queryKey: plannerKeys.checklist(workspaceId, date),
    queryFn: async () =>
      unwrap<ChecklistItem[]>(
        await supabase
          .from('daily_checklists')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('item_date', date)
          .order('position')
          .order('created_at'),
      ),
  })
}

export function useAddChecklistItem() {
  const { workspaceId } = useWorkspace()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({
      date,
      title,
      position,
    }: {
      date: string
      title: string
      position: number
    }) =>
      unwrap<ChecklistItem>(
        await supabase
          .from('daily_checklists')
          .insert({ workspace_id: workspaceId, item_date: date, title, position })
          .select()
          .single(),
      ),
    onSuccess: invalidate,
  })
}

export function useUpdateChecklistItem() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<Pick<ChecklistItem, 'title' | 'is_completed'>>
    }) =>
      unwrap<ChecklistItem>(
        await supabase.from('daily_checklists').update(patch).eq('id', id).select().single(),
      ),
    onSuccess: invalidate,
  })
}

export function useDeleteChecklistItem() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('daily_checklists').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

/** Copy unfinished items from one day to another (e.g. carry yesterday forward). */
export function useCarryOverChecklist() {
  const { workspaceId } = useWorkspace()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({
      items,
      toDate,
      startPosition,
    }: {
      items: ChecklistItem[]
      toDate: string
      startPosition: number
    }) => {
      if (!items.length) return
      const { error } = await supabase.from('daily_checklists').insert(
        items.map((item, i) => ({
          workspace_id: workspaceId,
          item_date: toDate,
          title: item.title,
          position: startPosition + i,
        })),
      )
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}
