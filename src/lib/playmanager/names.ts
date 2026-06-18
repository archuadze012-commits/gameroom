const GEORGIAN_FIRST = [
  'გიორგი','ნიკა','ლუკა','დავითი','ანა','ნინო','მარიამ','სოფო','ლევანი','გია',
  'ბაჩო','სანდრო','ვახო','ზაზა','მამუკა','თამარ','ეკა','ნათია','სალომე','ბესო',
  'გუგა','ვალო','მიშა','ტარიელ','ზურა','მიქა','ირა','ნათელა','ქეთი','ლადო',
  'ირაკლი','ბექა','ნოდარ','ოთარ','ჯემალ','ვასო','ელენე','ხათუნა','ლიკა','ციური',
  'კახა','შოთა','გოჩა','ჯაბა','ლაშა','ხვიჩა','ნუგზარ','გელა','არჩილ','მალხაზ',
];

const GEORGIAN_LAST = [
  'ბერიძე','კვარაცხელია','ჩიქოვანი','მჭედლიშვილი','გამყრელიძე','სულაბერიძე',
  'ჭოლოყაშვილი','ელიავა','ნოზაძე','ვეფხვაძე','ასათიანი','ჯოხაძე','ქობულაძე',
  'ხვიჩია','გობეჩია','კვატაშიძე','ბარამიძე','ლომიძე','ფხალაძე','ცქვიტარიძე',
  'ჭანია','ჯინჭარაძე','ბეგიაშვილი','გელაშვილი','კიკნაძე','ტყეშელაშვილი',
  'ჩხეიძე','ჩიქავა','ბაგრატიონი','ხარაზი','მდინარაძე','კახიაშვილი','ცოტნიაშვილი',
  'ჩაჩანიძე','ხვადაგიანი','ქარჩავა','ჩოლოყაშვილი','გიგაური','ყოიფური','ღამბაშიძე',
];

const INTL_FIRST = [
  'Carlos','Marco','Luis','Ahmed','Yusuf','Jakub','Mateus','Luca','Kylian','Erling',
  'Vinicius','Pedri','Gavi','Jude','Phil','Declan','Mason','Bukayo','Trent','Rodri',
  'Florian','Kai','Leroy','Serge','Jamal','Rafael','André','Pablo','Sergio','Diego',
  'Ivan','Andrei','Viktor','Milan','Luka','Marko','Stefan','Nikola','Aleksandar','Dusan',
];

const INTL_LAST = [
  'Silva','Santos','Costa','Rodrigues','Ferreira','Carvalho','Moreira','Sousa',
  'Müller','Schmidt','Fischer','Weber','Wagner','Becker','Schulz','Hoffmann',
  'García','Martínez','López','Sánchez','González','Pérez','Jiménez','Hernández',
  'Nkosi','Okafor','Diallo','Traoré','Koné','Coulibaly','Dembélé','Diop',
  'Kovač','Petrov','Novak','Jović','Ilić','Marić','Tomić','Babić',
];

export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export interface NameResult {
  display: string;
  normalized: string;
}

export async function generateUniqueName(
  excluded: Set<string>,
  pool: 'virtual' | 'georgian' = 'virtual',
): Promise<NameResult> {
  const firsts = pool === 'georgian' ? GEORGIAN_FIRST : [...GEORGIAN_FIRST, ...INTL_FIRST];
  const lasts  = pool === 'georgian' ? GEORGIAN_LAST  : [...GEORGIAN_LAST,  ...INTL_LAST];

  const maxAttempts = Math.min(firsts.length * lasts.length, 500);
  for (let i = 0; i < maxAttempts; i++) {
    const first = firsts[Math.floor(Math.random() * firsts.length)];
    const last  = lasts [Math.floor(Math.random() * lasts.length)];
    const display    = `${first} ${last}`;
    const normalized = normalizeName(display);
    if (!excluded.has(normalized)) return { display, normalized };
  }
  throw new Error('name_pool_exhausted');
}
