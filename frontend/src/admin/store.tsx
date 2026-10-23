"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import type { ReactNode } from "react";
import { seedEmployees, seedLeaves } from "./mock";
import type { Employee, EmployeeInput, LeaveRequest, LeaveStatus } from "./types";

// Mock persistence: the data lives in this browser's localStorage so edits survive a reload. There is no server.
const STORAGE_KEY = "phuan-admin-mock-v1";

interface State {
  employees: Employee[];
  leaves: LeaveRequest[];
}

type Action =
  | { type: "load"; state: State }
  | { type: "add"; input: EmployeeInput }
  | { type: "update"; id: string; input: EmployeeInput }
  | { type: "delete"; id: string }
  | { type: "leave"; id: string; status: LeaveStatus }
  | { type: "reset" };

const initial: State = { employees: seedEmployees, leaves: seedLeaves };

function nextNumber(employees: Employee[]) {
  return employees.reduce((max, e) => Math.max(max, Number(e.id.slice(1)) || 0), 0) + 1;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "load":
      return action.state;
    case "add": {
      const n = nextNumber(state.employees);
      const employee: Employee = { ...action.input, id: `e${n}`, code: `NV${String(n).padStart(3, "0")}` };
      return { ...state, employees: [employee, ...state.employees] };
    }
    case "update":
      return { ...state, employees: state.employees.map((e) => (e.id === action.id ? { ...e, ...action.input } : e)) };
    case "delete":
      return {
        employees: state.employees.filter((e) => e.id !== action.id),
        leaves: state.leaves.filter((l) => l.employeeId !== action.id),
      };
    case "leave":
      return { ...state, leaves: state.leaves.map((l) => (l.id === action.id ? { ...l, status: action.status } : l)) };
    case "reset":
      return initial;
  }
}

interface Store extends State {
  addEmployee: (input: EmployeeInput) => void;
  updateEmployee: (id: string, input: EmployeeInput) => void;
  deleteEmployee: (id: string) => void;
  setLeaveStatus: (id: string, status: LeaveStatus) => void;
  resetData: () => void;
}

const StoreContext = createContext<Store | null>(null);

export function AdminStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const loaded = useRef(false);

  // Read the saved data after mount, so the server render and the first client render both show the seed data.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as State;
        if (Array.isArray(saved.employees) && Array.isArray(saved.leaves)) dispatch({ type: "load", state: saved });
      }
    } catch {
      // unreadable or blocked storage: keep the seed data
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full or blocked: the data just will not survive a reload
    }
  }, [state]);

  const addEmployee = useCallback((input: EmployeeInput) => dispatch({ type: "add", input }), []);
  const updateEmployee = useCallback((id: string, input: EmployeeInput) => dispatch({ type: "update", id, input }), []);
  const deleteEmployee = useCallback((id: string) => dispatch({ type: "delete", id }), []);
  const setLeaveStatus = useCallback((id: string, status: LeaveStatus) => dispatch({ type: "leave", id, status }), []);
  const resetData = useCallback(() => dispatch({ type: "reset" }), []);

  const value = useMemo<Store>(
    () => ({ ...state, addEmployee, updateEmployee, deleteEmployee, setLeaveStatus, resetData }),
    [state, addEmployee, updateEmployee, deleteEmployee, setLeaveStatus, resetData],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAdminStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useAdminStore must be used inside AdminStoreProvider");
  return store;
}
