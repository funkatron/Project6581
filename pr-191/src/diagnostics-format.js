import {formatSidEventLogText} from './sid-event-log.js?v=0.20.0+20261123T190617904Z';
import {formatStudioTraceText} from './studio-trace-log.js?v=0.20.0+20261123T190617904Z';

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