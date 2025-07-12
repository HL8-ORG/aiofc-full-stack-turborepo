import React from "react";
import {CalendarProvider} from "@/modules/calendar/contexts/calendar-context";
import {CalendarHeader} from "@/modules/calendar/components/header/calendar-header";
import {CalendarBody} from "@/modules/calendar/components/calendar-body";

import {EventUpdateHandler} from "@/modules/calendar/components/event-update-handler";
import {DragDropProvider} from "@/modules/calendar/contexts/drag-drop-context";
import {getEvents, getUsers} from "@/modules/calendar/requests";

async function getCalendarData() {
    await new Promise(resolve => setTimeout(resolve, 5000));

    return {
        events: await getEvents(),
        users: await getUsers()
    };
}

export async function Calendar() {

    const {events , users} = await getCalendarData();

    return (
        <DragDropProvider>
            <CalendarProvider events={events} users={users} view="month">
                <div className="w-full border rounded-xl">
                    <EventUpdateHandler />
                    <CalendarHeader/>
                    <CalendarBody/>
                </div>
            </CalendarProvider>
        </DragDropProvider>
    );
}