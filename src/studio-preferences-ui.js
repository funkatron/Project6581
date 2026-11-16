export function mountPreferencesDialog($){
 const dialog=$('preferencesDialog');
 if(!dialog)return;
 $('preferencesOpen')?.addEventListener('click',()=>dialog.showModal());
 $('preferencesClose')?.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
}