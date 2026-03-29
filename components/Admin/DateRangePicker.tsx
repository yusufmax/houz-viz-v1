import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DateRangePickerProps {
    startDate: string;
    endDate: string;
    onChange: (start: string, end: string) => void;
}

const formatDisplayDate = (dateString: string) => {
    if (!dateString) return 'Select Date';
    // dateString comes in as YYYY-MM-DD
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const [year, month, day] = parts;
    return `${day}.${month}.${year}`;
};

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => {
    let day = new Date(year, month, 1).getDay();
    // adjust for monday start if desired, but default is sunday=0
    return day;
};

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Parse incoming YYYY-MM-DD
    const initialStart = startDate ? new Date(startDate) : new Date();
    const [currentMonth, setCurrentMonth] = useState(initialStart.getMonth());
    const [currentYear, setCurrentYear] = useState(initialStart.getFullYear());

    // Selection state
    const [selectingStart, setSelectingStart] = useState<string | null>(startDate || null);
    const [selectingEnd, setSelectingEnd] = useState<string | null>(endDate || null);

    useEffect(() => {
        setSelectingStart(startDate || null);
        setSelectingEnd(endDate || null);
    }, [startDate, endDate]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const prevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(y => y - 1);
        } else {
            setCurrentMonth(m => m - 1);
        }
    };

    const nextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(y => y + 1);
        } else {
            setCurrentMonth(m => m + 1);
        }
    };

    const handleDateClick = (day: number) => {
        const clickedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        if (!selectingStart || (selectingStart && selectingEnd)) {
            // Start new selection
            setSelectingStart(clickedDate);
            setSelectingEnd(null);
        } else if (selectingStart && !selectingEnd) {
            // End selection
            if (new Date(clickedDate) < new Date(selectingStart)) {
                setSelectingEnd(selectingStart);
                setSelectingStart(clickedDate);
            } else {
                setSelectingEnd(clickedDate);
            }
        }
    };

    const applySelection = () => {
        if (selectingStart && selectingEnd) {
            onChange(selectingStart, selectingEnd);
            setIsOpen(false);
        } else if (selectingStart) {
            // User only picked one day
            onChange(selectingStart, selectingStart);
            setIsOpen(false);
        }
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isStart = dateString === selectingStart;
            const isEnd = dateString === selectingEnd;
            let inRange = false;
            if (selectingStart && selectingEnd) {
                const currDt = new Date(dateString);
                const startDt = new Date(selectingStart);
                const endDt = new Date(selectingEnd);
                if (currDt > startDt && currDt < endDt) {
                    inRange = true;
                }
            }

            days.push(
                <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`w-8 h-8 flex items-center justify-center text-xs rounded-full transition-all
                        ${isStart || isEnd ? 'bg-indigo-600 text-white font-bold' : ''}
                        ${inRange ? 'bg-indigo-600/30 text-indigo-300' : ''}
                        ${!isStart && !isEnd && !inRange ? 'hover:bg-slate-700 text-slate-300' : ''}
                    `}
                >
                    {day}
                </button>
            );
        }
        return days;
    };

    const handleQuickSelect = (days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);
        
        const formatDt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        
        const newStart = formatDt(start);
        const newEnd = formatDt(end);
        setSelectingStart(newStart);
        setSelectingEnd(newEnd);
        onChange(newStart, newEnd);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={popoverRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 hover:border-indigo-500/50 transition-colors shadow-inner"
            >
                <CalendarIcon size={14} className="text-indigo-400" />
                <span className="text-xs font-black tracking-widest text-slate-300 uppercase">
                    {formatDisplayDate(startDate)} <span className="text-slate-600 font-normal mx-1">—</span> {formatDisplayDate(endDate)}
                </span>
            </button>

            {/* Popover */}
            {isOpen && (
                <div className="absolute top-12 right-0 bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl z-50 flex flex-col md:flex-row gap-6 animate-in fade-in slide-in-from-top-2">
                    
                    {/* Quick Select Panel */}
                    <div className="flex flex-col gap-2 border-b md:border-b-0 md:border-r border-slate-800 pb-4 md:pb-0 md:pr-4 min-w-[140px]">
                        <button onClick={() => handleQuickSelect(0)} className="text-left text-xs text-slate-400 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors">Today</button>
                        <button onClick={() => handleQuickSelect(1)} className="text-left text-xs text-slate-400 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors">Yesterday</button>
                        <button onClick={() => handleQuickSelect(7)} className="text-left text-xs text-slate-400 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors">Last 7 Days</button>
                        <button onClick={() => handleQuickSelect(30)} className="text-left text-xs text-slate-400 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors">Last 30 Days</button>
                        <button onClick={() => handleQuickSelect(90)} className="text-left text-xs text-slate-400 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors">Last 90 Days</button>
                    </div>

                    {/* Calendar Panel */}
                    <div className="flex flex-col gap-4 min-w-[260px]">
                        <div className="flex items-center justify-between">
                            <button onClick={prevMonth} className="p-1 text-slate-400 hover:text-white bg-slate-800 rounded-md"><ChevronLeft size={16} /></button>
                            <span className="text-sm border py-1 px-3 border-slate-700 rounded-lg font-bold text-white tracking-widest uppercase">{MONTH_NAMES[currentMonth]} {currentYear}</span>
                            <button onClick={nextMonth} className="p-1 text-slate-400 hover:text-white bg-slate-800 rounded-md"><ChevronRight size={16} /></button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center border-b border-slate-800 pb-2">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                <div key={d} className="text-[10px] font-black uppercase text-slate-500">{d}</div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                            {renderCalendar()}
                        </div>

                        <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                            <button onClick={() => setIsOpen(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-white font-bold transition-colors">Cancel</button>
                            <button onClick={applySelection} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl transition-colors shadow-lg shadow-indigo-500/20">Apply</button>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};
