// @flow

import type { Module, Semester } from 'types/modules';
import type { ExportData } from 'types/export';
import type { FSA, GetState } from 'types/redux';
import Raven from 'raven-js';
import { hydrateSemTimetableWithLessons } from 'utils/timetables';
import { getSemesterTimetable } from 'reducers/timetables';

function downloadUrl(blob: Blob, filename: string) {
  const link = document.createElement('a');
  if (window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveOrOpenBlob(blob, filename);
  } else {
    const objectUrl = URL.createObjectURL(blob);
    link.download = filename;
    link.href = objectUrl;
    link.dispatchEvent(new MouseEvent('click'));
    URL.revokeObjectURL(objectUrl);
  }
}

export const SUPPORTS_DOWNLOAD = 'download' in document.createElement('a');

export function downloadAsIcal(semester: Semester) {
  return (dispatch: Function, getState: GetState) => {
    Promise.all([
      import(/* webpackChunkName: "export", webpackPreload: true */ 'ical-generator'),
      import(/* webpackChunkName: "export", webpackPreload: true */ 'utils/ical'),
    ])
      .then(([ical, icalUtils]) => {
        const {
          moduleBank: { modules },
          timetables,
        } = getState();
        const { timetable } = getSemesterTimetable(semester, timetables);
        const timetableWithLessons = hydrateSemTimetableWithLessons(timetable, modules, semester);

        const events = icalUtils.default(semester, timetableWithLessons, modules);
        const cal = ical.default({
          domain: 'nusmods.com',
          prodId: '//NUSMods//NUSMods//EN',
          events,
        });

        const blob = new Blob([cal.toString()], { type: 'text/plain' });
        downloadUrl(blob, 'nusmods_calendar.ics');
      })
      .catch((e) => {
        Raven.captureException(e);
        console.error(e); // eslint-disable-line no-console
      });
  };
}

export const SET_EXPORTED_DATA = 'SET_EXPORTED_DATA';
export function setExportedData(modules: Module[], data: ExportData): FSA {
  return {
    type: SET_EXPORTED_DATA,
    payload: {
      modules,
      ...data,
    },
  };
}
