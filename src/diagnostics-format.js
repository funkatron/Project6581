import {formatSidEventLogText} from './sid-event-log.js?v=__BUILD_ID__';
import {formatStudioTraceText} from './studio-trace-log.js?v=__BUILD_ID__';

export function formatDiagnosticActivityText(studioSnapshot,eventSnapshot){
 const studio=formatStudioTraceText(studioSnapshot,{
  headerLines:['— Studio —'],
  newestFirst:true
 });
 const notes=eventSnapshot?.enabled
  ?formatSidEventLogText(eventSnapshot,{
    headerLines:['— Note events —'],
    newestFirst:true
  })
  :'— Note events —\nDetailed note logging is off. Open this panel (or check Log note events) before playing.';
 return 'Activity (newest first):\n\n'+studio+'\n\n'+notes;
}