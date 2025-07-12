import {CalendarHeaderSkeleton} from "@/modules/calendar/components/skeletons/calendar-header-skeleton";
import {MonthViewSkeleton} from "@/modules/calendar/components/skeletons/month-view-skeleton";

export function CalendarSkeleton() {
    return (
        <div className='container mx-auto'>
            <div className="flex h-screen flex-col">
                <CalendarHeaderSkeleton/>
                <div className="flex-1">
                    <MonthViewSkeleton/>
                </div>
            </div>
        </div>
    )
}