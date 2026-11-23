/** Parse a single 3-byte channel MIDI message (note on/off, control change). */
export function parseMidiMessage(bytes){
 if(!bytes?.length)return null;
 const status=bytes[0];
 const kind=status&0xf0;
 const channel=(status&0x0f)+1;
 if(kind===0x90){
  const note=bytes[1],velocity=bytes[2];
  if(note==null)return null;
  if(velocity===0)return {kind:'note-off',channel,note,velocity:0};
  return {kind:'note-on',channel,note,velocity:velocity??0};
 }
 if(kind===0x80){
  const note=bytes[1];
  if(note==null)return null;
  return {kind:'note-off',channel,note,velocity:bytes[2]??0};
 }
 if(kind===0xb0){
  if(bytes[1]==null||bytes[2]==null)return null;
  return {kind:'cc',channel,controller:bytes[1],value:bytes[2]};
 }
 return null;
}