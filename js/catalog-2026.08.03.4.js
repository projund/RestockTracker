(() => {
  const VERSION='2026.08.03.4';
  const VERSION_KEY='crt-catalog-version';
  if(localStorage.getItem(VERSION_KEY)===VERSION) return;
  let old=[];
  try{old=JSON.parse(localStorage.getItem('crt-v4-products')||'[]')}catch{}
  const favorites=new Set(old.filter(p=>p.favorite).map(p=>[p.category,p.game||p.brand||p.beyType,p.setName||'',p.productName||p.beyModel].join('|')));
  const products=[];
  const add=(id,category,data)=>products.push({id,category,retail:0,favorite:favorites.has([category,data.game||data.brand||data.beyType,data.setName||'',data.productName||data.beyModel].join('|')),image:'',imageSource:'',walmart:'',target:'',identifiers:'',notes:'',active:true,...data});
  const tcg={
    'Pokémon|Destined Rivals':['Elite Trainer Box','Booster Bundle','Booster Box','Sleeved Booster Pack','Single Booster Pack','3-Pack Blister','Checklane Blister','Build & Battle Box','Build & Battle Stadium','Mini Tin','Tin','Collection Box','Premium Collection','Poster Collection','Binder Collection','Sleeves'],
    'Pokémon|Journey Together':['Elite Trainer Box','Booster Bundle','Booster Box','Sleeved Booster Pack','Single Booster Pack','3-Pack Blister','Checklane Blister','Build & Battle Box','Build & Battle Stadium','Mini Tin','Tin','Collection Box','Premium Collection','Poster Collection','Binder Collection','Sleeves'],
    'Pokémon|Black Bolt':['Elite Trainer Box','Booster Bundle','Booster Box','Sleeved Booster Pack','Single Booster Pack','3-Pack Blister','Mini Tin','Tin','Collection Box','Premium Collection','Poster Collection','Binder Collection','Tech Sticker Collection','Sleeves'],
    'Riftbound|Origins':['Booster Box','Booster Pack','Starter Deck','Champion Deck','Bundle','Playmat','Sleeves'],
    'Disney Lorcana|Reign of Jafar':['Booster Box','Booster Pack','Starter Deck',"Illumineer's Trove",'Gift Set','Portfolio','Playmat','Sleeves'],
    'Disney Lorcana|Fabled':['Booster Box','Booster Pack','Starter Deck',"Illumineer's Trove",'Gift Set',"Collector's Set",'Portfolio','Playmat','Sleeves'],
    'Gundam|Newtype Rising':['Booster Box','Booster Pack','Starter Deck','Deck Set','Premium Card Collection','Sleeves'],
    'One Piece|OP-12':['Booster Box','Booster Pack','Double Pack','Starter Deck','Gift Collection','Premium Card Collection','Sleeves']
  };
  let n=1;
  Object.entries(tcg).forEach(([key,types])=>{const [game,setName]=key.split('|');types.forEach(productName=>add(`catalog-tcg-${n++}`,'TCG',{game,setName,productName}))});
  add('catalog-other-tcg','TCG',{game:'Other',setName:'Other',productName:'Other'});
  const needoh=['Atomic NeeDoh','Color Changing NeeDoh','Cool Cats NeeDoh','Happy Snappy','Jelly Dohnut NeeDoh','Classic NeeDoh','NeeDoh Advent Calendar','NeeDoh Bunnies & Chicks Assortment','NeeDoh Color Change Squeeze Heart','NeeDoh Cool Cane','NeeDoh Dig’ It Pig','NeeDoh Dohnut Holes','NeeDoh Dohnuts','NeeDoh Dream Drop','NeeDoh Funky Pup','NeeDoh Fuzz Ball Flower Power','NeeDoh Fuzz Ball Wonder Waves','NeeDoh Ginger Glowman','NeeDoh Good Vibes Only','NeeDoh Groovy Shroom','NeeDoh Gumdrop','NeeDoh Gummy Bear','NeeDoh Mello Mallo','NeeDoh Nice Berg','NeeDoh Nice Cube','NeeDoh Piece of Cake','NeeDoh Press-Doh','NeeDoh Color Change Cube','Super NeeDoh','Teenie NeeDoh Singles','NeeDoh Ripples','NeeDoh Swirl','NeeDoh Glow in the Dark','NeeDoh Snow Ball','NeeDoh Original Minis'];
  needoh.forEach((productName,i)=>add(`catalog-needoh-${i+1}`,'Squishies',{brand:'NeeDoh',productName}));
  [['Squeeeze','Ice Cream Cone'],['Taba','Smushers'],['Taba','Mini Mochi Set'],['Dumpling','Mystery Dumpling']].forEach(([brand,productName],i)=>add(`catalog-squishy-${i+1}`,'Squishies',{brand,productName}));
  add('catalog-other-squishies','Squishies',{brand:'Other',productName:'Other'});
  const wave1=[
    ['Sword Dran 3-60F','Starter'],['Helm Knight 3-80N','Starter'],['Arrow Wizard 4-80B','Starter'],['Scythe Incendio 4-60T','Starter'],
    ['Steel Samurai 4-80T','Booster'],['Horn Rhino 3-80S','Booster'],['Keel Shark 3-60LF','Booster'],['Talon Ptera 3-80B','Booster'],
    ['Knife Shinobi 4-80HN & Keel Shark 3-80F','Dual Pack'],['Chain Incendio 5-60HT & Arrow Wizard 4-60N','Dual Pack'],['Tail Viper 5-80O & Sword Dran 3-60F','Dual Pack'],
    ['Soar Phoenix 9-60GF Deluxe String Launcher Set','Deluxe Set'],['Dranzer Spiral 3-80T Red Edition','Exclusive'],
    ['Xtreme Battle Set: Dagger Dran 4-60R & Tusk Mammoth 3-60T','Stadium Set'],
    ['Transformers Deluxe Set: Optimus Primal 3-60F & Starscream 3-80N','Exclusive'],['Transformers Deluxe Set: Optimus Prime 4-60P & Megatron 4-80B','Exclusive'],
    ['Beystadium','Stadium'],['Winder Launcher','Accessory']
  ];
  wave1.forEach(([beyModel,beyType],i)=>add(`catalog-bey-wave1-${i+1}`,'Beyblade',{beyModel,beyType,productName:beyModel}));
  add('catalog-other-beyblade','Beyblade',{beyModel:'Other',beyType:'Other',productName:'Other'});
  localStorage.setItem('crt-v4-products',JSON.stringify(products));
  localStorage.setItem(VERSION_KEY,VERSION);
})();