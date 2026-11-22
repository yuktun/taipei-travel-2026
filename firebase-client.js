// Loaded only after an explicit local configuration is provided.
export async function connect(config, rememberLogin = false){
 const base='https://www.gstatic.com/firebasejs/12.16.0/';
 const [{initializeApp},a,f]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore.js')]);
 const app=initializeApp(config.firebase,'taipei-travel'),auth=a.getAuth(app),db=f.initializeFirestore(app,{localCache:f.memoryLocalCache()});
 const setRememberLogin = keep => a.setPersistence(auth,keep ? a.browserLocalPersistence : a.browserSessionPersistence);
 await auth.authStateReady();
 if (!auth.currentUser) await setRememberLogin(rememberLogin);
 const root=f.doc(db,'taipeiTrips',config.tripId);
 return {setRememberLogin,watchAuth:cb=>a.onAuthStateChanged(auth,cb),login:()=>{const provider=new a.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});return a.signInWithPopup(auth,provider)},logout:()=>a.signOut(auth),
  membership:async uid=>(await f.getDocFromServer(f.doc(root,'members',uid))).data(),
  watchMembership:(uid,cb,err)=>f.onSnapshot(f.doc(root,'members',uid),s=>cb(s.data()),err),
  watchTrip:(cb,err)=>f.onSnapshot(root,s=>cb(s.data()),err),
  watchItems:(cb,err)=>f.onSnapshot(f.collection(root,'items'),s=>cb(s.docs.map(d=>({id:d.id,...d.data()}))),err),
  add:item=>f.addDoc(f.collection(root,'items'),item),update:(id,item)=>f.updateDoc(f.doc(root,'items',id),item),remove:id=>f.deleteDoc(f.doc(root,'items',id))};
}
