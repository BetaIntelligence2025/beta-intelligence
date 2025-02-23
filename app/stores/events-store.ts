import { create } from 'zustand'
import { Event } from '../types/events-type'


interface EventsState {
  events: Event[]
  isLoading: boolean
  error: string | null
  setEvents: (events: Event[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useEventsStore = create<EventsState>((set) => ({
  events: [],
  isLoading: false,
  error: null,
  setEvents: (events) => set({ events }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error })
})) 