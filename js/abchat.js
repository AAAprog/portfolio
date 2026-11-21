// AB's conversation brain: a hand-written knowledge base about Ahmed, and nothing else.
// - Replies in the language the visitor writes in (Arabic script → Arabic).
// - Keeps the last topic, so follow-ups like "more?" / "وبعدين؟" work.
// - Can answer two things asked in one message.
// - Stays on topic: anything that is not about Ahmed is politely declined, and
//   personal matters (family, salary, religion…) are kept private.
// - Each answer carries a mood, which the character's face acts out.
const BORN = 2002;
const age = () => new Date().getFullYear() - BORN;

const norm = s => ' ' + s.toLowerCase()
  .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ًٌٍَُِّْـ]/g, '')
  .replace(/[?؟!.,،:;"'’()]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';

// Each topic: words that point to it (English + Arabic, formal and Saudi), a group
// (so two answers never repeat each other), a mood, and the answers.
const T = [
  { id: 'hello', g: 'chat', mood: 'happy', w: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'salam', 'مرحبا', 'هلا', 'السلام عليكم', 'سلام', 'اهلين', 'اهلا', 'صباح الخير', 'مساء الخير'],
    en: () => "Hi! I'm AB. I'm here to tell you about Ahmed: his studies, his experience, his projects, and how to reach him. What would you like to know?",
    ar: () => 'هلا والله وغلا! أنا AB، مساعد أحمد. اسألني عن دراسته، شغله، مشاريعه، أو كيف توصله.' },
  { id: 'howareyou', g: 'chat', mood: 'happy', w: ['how are you', 'how r u', 'how is it going', 'whats up', 'كيفك', 'كيف حالك', 'شلونك', 'كيف الحال', 'وش اخبارك', 'علومك', 'اخبارك'],
    en: () => "Doing great, thanks for asking! Ready to tell you about Ahmed. What would you like to know?",
    ar: () => 'بخير الله يسلمك! وش ودّك تعرف عن أحمد؟' },
  { id: 'bot', g: 'chat', mood: 'happy', w: ['who are you', 'what are you', 'are you a bot', 'are you ai', 'are you human', 'are you real', 'your name', 'who made you', 'who built you', 'what can you do', 'مين انت', 'من انت', 'وش انت', 'انت بوت', 'انت انسان', 'اسمك', 'مين سواك', 'مين صنعك', 'وش تقدر تسوي', 'وش تسوي انت'],
    en: () => "I'm AB, the assistant on Ahmed's portfolio. I'm not a general chatbot: I only talk about Ahmed. I can tell you about his studies, experience, projects and skills, and take you to any part of the site.",
    ar: () => 'أنا AB، مساعد أحمد في موقعه. ما أعرف إلا عن أحمد: دراسته، شغله، مشاريعه، ومهاراته. وأقدر أوديك لأي قسم بالموقع.' },
  { id: 'who', g: 'who', w: ['who is ahmed', 'who is he', 'who s ahmed', 'who s he', 'about ahmed', 'about him', 'tell me about ahmed', 'tell me about him', 'introduce', 'what does he do', 'what does ahmed do', 'summary', 'bawazir', 'مين احمد', 'من هو احمد', 'من احمد', 'احكي لي عنه', 'احكيلي عنه', 'كلمني عنه', 'تكلم عن احمد', 'ابي اعرف عنه', 'مين هو', 'من هو', 'عرفني', 'عن احمد', 'نبذه', 'تعريف', 'وش يسوي', 'ايش يسوي', 'وش شغله', 'ايش شغله', 'وش يشتغل', 'ايش يشتغل', 'وش وظيفته', 'ايش وظيفته', 'باوزير'],
    en: () => 'Ahmed Bawazir is a software engineer and Oracle Fusion HCM consultant based in Riyadh. He builds full-stack products, like Codai, UFC Ticketing and MyCal, and configures enterprise HR systems.',
    ar: () => 'أحمد باوزير مهندس برمجيات ومستشار Oracle Fusion HCM من الرياض. يبني منتجات من الصفر لين تشتغل، مثل Codai وUFC Ticketing وMyCal، ويضبط أنظمة الموارد البشرية للشركات.',
    more: { en: () => 'He was born in 2002, studied Software Engineering in Malaysia, and graduated with First Class Honours.', ar: () => 'مواليد 2002، درس هندسة برمجيات في ماليزيا وتخرّج بمرتبة الشرف الأولى.' } },
  { id: 'age', g: 'age', w: ['how old', 'age', 'born', 'birth', 'birthday', 'year of birth', 'كم عمره', 'عمره', 'متى ولد', 'متى انولد', 'سنه ميلاده', 'العمر', 'مواليد', 'ميلاد', 'تولد', 'انولد', 'كم سنه عمره'],
    en: () => `Ahmed was born in 2002, so he's about ${age()}.`,
    ar: () => `أحمد مواليد 2002، يعني عمره تقريباً ${age()}.` },
  { id: 'study', g: 'edu', w: ['study', 'studied', 'studying', 'university', 'uni', 'college', 'degree', 'education', 'graduate', 'graduated', 'graduation', 'school', 'major', 'bachelor', 'uniten', 'درس', 'دراسه', 'دراسته', 'جامعه', 'الجامعه', 'تخرج', 'تخصص', 'تخصصه', 'شهادته الجامعيه', 'بكالوريوس', 'كليه', 'تعليمه'],
    en: () => 'Ahmed studied in Malaysia, at Universiti Tenaga Nasional (UNITEN). He earned a Bachelor of Computer Science (Hons.) in Software Engineering, 2023 to 2026.',
    ar: () => 'درس في ماليزيا، في جامعة تيناغا الوطنية (UNITEN)، بكالوريوس علوم حاسب تخصص هندسة برمجيات، من 2023 لين 2026.',
    more: { en: () => 'He graduated with First Class Honours, CGPA 3.63 out of 4. His final-year project was Codai.', ar: () => 'وتخرّج بمرتبة الشرف الأولى، معدله 3.63 من 4، ومشروع تخرّجه Codai.' } },
  { id: 'country', g: 'edu', w: ['which country', 'what country', 'malaysia', 'abroad', 'kuala lumpur', 'kajang', 'باي دوله', 'اي دوله', 'وين درس', 'ماليزيا', 'برا السعوديه', 'الخارج', 'كوالالمبور'],
    en: () => 'Ahmed studied in Malaysia, at Universiti Tenaga Nasional (UNITEN), near Kuala Lumpur: a Bachelor of Computer Science (Hons.) in Software Engineering.',
    ar: () => 'درس في ماليزيا، في جامعة UNITEN جنب كوالالمبور، تخصص هندسة برمجيات.',
    more: { en: () => 'He graduated in 2026 with First Class Honours, CGPA 3.63 out of 4. His final-year project was Codai.', ar: () => 'وتخرّج 2026 بمرتبة الشرف الأولى، معدله 3.63 من 4، ومشروع تخرّجه Codai.' } },
  { id: 'gpa', g: 'edu', mood: 'happy', w: ['gpa', 'cgpa', 'grade', 'honours', 'honors', 'first class', 'معدل', 'معدله', 'المعدل', 'درجاته', 'تقدير', 'مرتبه الشرف'],
    en: () => 'First Class Honours, with a CGPA of 3.63 out of 4.',
    ar: () => 'معدله 3.63 من 4، وتخرّج بمرتبة الشرف الأولى 👌' },
  { id: 'where', g: 'place', w: ['where does he live', 'where is he', 'where is ahmed', 'based', 'location', 'live', 'city', 'where is he from', 'وين يسكن', 'يسكن', 'ساكن', 'مكانه', 'وين هو', 'مدينته', 'من وين', 'وين عايش', 'مقيم'],
    en: () => "Ahmed is based in Riyadh, Saudi Arabia. That's where he grew up, too.",
    ar: () => 'أحمد في الرياض، وفيها تربّى بعد.' },
  { id: 'origin', g: 'place', w: ['nationality', 'saudi', 'سعودي', 'جنسيته', 'جنسيه', 'اصله'],
    en: () => 'Ahmed grew up in Riyadh, Saudi Arabia, and he’s based there now.',
    ar: () => 'أحمد تربّى في الرياض وعايش فيها الحين.' },
  { id: 'journey', g: 'story', w: ['story', 'journey', 'background', 'path', 'قصته', 'قصه', 'رحلته', 'مسيرته', 'خلفيته'],
    en: () => 'Short version: Ahmed grew up in Riyadh, went to Malaysia for his Software Engineering degree, worked remotely from Malaysia for a Doha-based company during his final year (he never moved to Qatar), built Codai as his graduation project, then came back to Riyadh for Oracle Fusion HCM. The 85-second intro tells it better.',
    ar: () => 'باختصار: تربّى في الرياض، وراح ماليزيا يدرس هندسة برمجيات، وفي آخر سنة اشتغل عن بُعد مع شركة مقرها الدوحة، وسوّى Codai مشروع تخرّج، وبعدها رجع الرياض واشتغل على Oracle Fusion HCM. وفيلم التعريف يحكيها أحلى، 85 ثانية بس.' },
  { id: 'job', g: 'work', w: ['job', 'work', 'experience', 'career', 'company', 'intern', 'internship', 'macquires', 'employer', 'doing now', 'current role', 'خبره', 'خبرات', 'خبرته', 'خبراته', 'وظيفته', 'يشتغل', 'اشتغل', 'شغله الحالي', 'تدريب', 'شركه', 'وين يشتغل', 'عمله'],
    en: () => 'Most recently, Ahmed was an Oracle Fusion HCM Consultant Intern at Macquires in Riyadh (June to August 2026). Before that, he worked part-time as a Software Engineer for Sifr IDE, a Doha-based company, fully remotely from Malaysia (February to May 2026).',
    ar: () => 'آخر شغل له متدرّب مستشار Oracle Fusion HCM في Macquires بالرياض، من يونيو لين أغسطس 2026. وقبلها مهندس برمجيات دوام جزئي مع Sifr IDE عن بُعد، من فبراير لين مايو 2026.',
    more: { en: () => 'At Macquires he configured Core HR, absence management, payroll links, DFFs, value sets and Groovy triggers, and ran end-to-end testing.', ar: () => 'في Macquires ضبط Core HR والإجازات وربطها بالرواتب، وبنى DFFs وValue Sets وGroovy triggers، واختبر كل شي من البداية للنهاية.' } },
  { id: 'sifr', g: 'work', w: ['sifr', 'doha', 'qatar', 'part time', 'part-time', 'صفر', 'الدوحه', 'قطر', 'دوام جزئي'],
    en: () => 'Sifr IDE is a Doha-based company. Ahmed worked for it fully remotely from Malaysia (February to May 2026), without travelling to Qatar. He tested interfaces, workflows and business logic, reproduced defects, helped find their root causes, and proposed practical fixes.',
    ar: () => 'Sifr IDE شركة مقرها الدوحة، واشتغل معها عن بُعد من ماليزيا. كان يختبر الواجهات ومنطق النظام، ويلقط الأخطاء ويوصل لسببها، ويقترح حلول عملية.' },
  { id: 'qatar', g: 'work', w: ['been to qatar', 'go to qatar', 'went to qatar', 'live in qatar', 'lived in qatar', 'move to qatar', 'in qatar', 'in doha', 'راح قطر', 'سافر قطر', 'سكن في قطر', 'عاش في قطر', 'في قطر', 'في الدوحه', 'زار قطر'],
    en: () => 'No, Ahmed has never been to Qatar. He worked for Sifr IDE, a company based in Doha, fully remotely while he was studying in Malaysia.',
    ar: () => 'لا، ما راح قطر. اشتغل مع Sifr IDE (مقرها الدوحة) عن بُعد وهو يدرس في ماليزيا.' },
  { id: 'years', g: 'work', w: ['years of experience', 'how many years', 'how long has he', 'senior', 'junior', 'fresh', 'كم سنه خبره', 'سنوات الخبره', 'سنين خبره', 'حديث تخرج', 'خريج جديد'],
    en: () => 'Ahmed is a recent graduate (2026). He has a three-month Oracle Fusion HCM internship at Macquires, four months of part-time software engineering at Sifr IDE, and three projects he built end to end.',
    ar: () => 'خريج جديد (2026). عنده ثلاث شهور تدريب Oracle Fusion HCM في Macquires، وأربع شهور مهندس برمجيات مع Sifr IDE، وثلاث مشاريع بناها كاملة.' },
  { id: 'hcm', g: 'hcm', w: ['oracle', 'hcm', 'fusion', 'hr system', 'payroll', 'absence', 'اوراكل', 'موارد بشريه', 'رواتب', 'اجازات'],
    en: () => 'In Oracle Fusion HCM, Ahmed works on Core HR, Workforce Structures, Absence Management, Documents of Record and Payroll, plus DFFs, value sets, Groovy/ADF, OTBI and BI Publisher.',
    ar: () => 'في Oracle Fusion HCM يشتغل على Core HR وهيكلة الموظفين والإجازات والرواتب وDocuments of Record، ومعها DFFs وValue Sets وGroovy وOTBI وBI Publisher.' },
  { id: 'projects', g: 'proj', act: 'projects', w: ['project', 'portfolio', 'built', 'apps', 'his work', 'best project', 'افضل مشروع', 'احسن مشروع', 'مشاريع', 'المشاريع', 'مشاريعه', 'مشروع', 'اعماله', 'وش بنى', 'وش سوى'],
    en: () => 'His main projects are Codai, an AI assistant for software engineers; UFC Ticketing, a full-stack booking system; and MyCal, a Flutter calorie tracker in development. I’ll scroll you to them.',
    ar: () => 'عنده ثلاث مشاريع: Codai مساعد ذكي للمبرمجين، وUFC Ticketing نظام حجز تذاكر، وMyCal تطبيق سعرات بـ Flutter قيد التطوير. تعال أوريك 👇' },
  { id: 'codai', g: 'proj', mood: 'happy', w: ['codai', 'final year', 'fyp', 'graduation project', 'كوداي', 'مشروع التخرج', 'مشروع تخرجه'],
    en: () => 'Codai is Ahmed’s final-year project: a web assistant for software engineers. It can generate the project idea itself, then requirements, UML diagrams, a database schema, code and test cases, all in one place. It’s built with Next.js, Supabase and the Gemini API, and it’s live on Vercel.',
    ar: () => 'Codai مشروع تخرّجه، وهو أحلى شي سوّاه: مساعد للمبرمجين يطلع لك فكرة المشروع، وبعدها المتطلبات ومخططات UML وقاعدة البيانات والكود والاختبارات، كله بمكان واحد. مبني بـ Next.js وSupabase وGemini ومنشور على Vercel.' },
  { id: 'ufc', g: 'proj', w: ['ufc', 'ticket', 'ticketing', 'booking', 'تذاكر', 'حجز'],
    en: () => 'UFC Ticketing is a full-stack event booking system in PHP and MySQL, with user and admin sides, seat booking and the back-end logic behind it.',
    ar: () => 'UFC Ticketing نظام حجز فعاليات بـ PHP وMySQL: واجهة للمستخدم، ولوحة تحكم للأدمن، وحجز مقاعد.' },
  { id: 'easycal', g: 'proj', w: ['mycal', 'easycal', 'calorie', 'flutter', 'dart', 'riverpod', 'mobile app', 'android', 'سعرات', 'تطبيق جوال', 'اندرويد'],
    en: () => 'MyCal is a calorie-tracking app Ahmed is building in Flutter for iOS and Android, in Arabic and English: food search with local dishes, barcode scanning, daily goals, water and weight tracking, and progress charts.',
    ar: () => 'MyCal تطبيق سعرات يشتغل عليه أحمد بـ Flutter للآيفون والأندرويد، بالعربي والإنجليزي: تدوّر أكلك حتى الأكلات المحلية، تمسح الباركود، تحط هدف يومي، وتتابع الماء والوزن برسوم واضحة.' },
  { id: 'skills', g: 'skills', w: ['skill', 'stack', 'tech', 'technologies', 'languages does he', 'programming', 'react', 'java', 'javascript', 'php', 'sql', 'node', 'docker', 'good at', 'frameworks', 'tools', 'مهارات', 'المهارات', 'مهاراته', 'وش يعرف', 'ايش يعرف', 'وش يجيد', 'يتقن', 'تقنيات', 'لغات البرمجه', 'برمجه', 'يبرمج', 'ادواته'],
    en: () => 'He codes in Java, Dart, C#, C++, JavaScript and PHP, builds with Flutter, React, Next.js, Node.js and Tailwind, and works with PostgreSQL, MySQL, SQLite, Oracle and Supabase. Plus Git, GitHub Actions, Codemagic, Docker and Figma.',
    ar: () => 'يبرمج بـ Java وDart وC# وC++ وJavaScript وPHP، ويبني بـ Flutter وReact وNext.js وNode.js، وقواعد بياناته PostgreSQL وMySQL وOracle وSupabase. ويستخدم Git وGitHub Actions وCodemagic وDocker وFigma بعد.' },
  { id: 'langs', g: 'langs', w: ['speak', 'arabic', 'english', 'spoken languages', 'bilingual', 'يتكلم', 'لغاته', 'عربي', 'انجليزي', 'انقليزي', 'يتحدث'],
    en: () => 'Arabic is his native language, and his English is professional.',
    ar: () => 'العربي لغته الأم، وإنجليزيته ممتازة وبمستوى مهني.' },
  { id: 'certs', g: 'certs', w: ['certificate', 'certification', 'certified', 'ccna', 'cisco', 'courses', 'شهادات', 'شهاداته', 'دورات', 'دوراته', 'سيسكو'],
    en: () => 'He holds Cisco CCNA: Introduction to Networks, "Build Smarter AI with Embeddings", and AI Singapore’s AI4I Literacy, AI4I Foundations and AI4E courses.',
    ar: () => 'عنده Cisco CCNA (أساسيات الشبكات)، ودورة Build Smarter AI with Embeddings، وثلاث دورات ذكاء اصطناعي من AI Singapore.' },
  { id: 'contact', g: 'contact', act: 'contact', w: ['contact', 'email', 'reach', 'hire', 'talk to him', 'get in touch', 'message him', 'تواصل', 'اتواصل', 'ايميل', 'ايميله', 'بريد', 'اكلمه', 'اوظف', 'توظيف', 'اوظفه', 'اراسله'],
    en: () => 'You can email Ahmed at aaa.bawazir0@gmail.com, or find him on LinkedIn. I’ll take you to the contact section.',
    ar: () => 'راسله على aaa.bawazir0@gmail.com أو كلّمه في LinkedIn. تعال أوديك لقسم التواصل 👇' },
  { id: 'social', g: 'contact', act: 'contact', w: ['linkedin', 'github', 'social', 'twitter', 'instagram', 'لينكدان', 'لنكدان', 'قيت هب', 'جيت هب', 'حساباته', 'تويتر', 'انستقرام'],
    en: () => 'Ahmed is on LinkedIn and on GitHub as aaaprog. Both links are in the contact section, I’ll take you there.',
    ar: () => 'تلقاه في LinkedIn، وفي GitHub باسم aaaprog. الروابط تحت في التواصل 👇' },
  { id: 'available', g: 'avail', mood: 'happy', w: ['available', 'open to', 'looking for', 'opportunit', 'hiring', 'freelance', 'full time', 'full-time', 'roles', 'position', 'متاح', 'يدور وظيفه', 'فرصه', 'فرص', 'وظيفه جديده', 'دوام كامل', 'فري لانس', 'عمل حر'],
    en: () => 'Yes! Ahmed is open to full-time roles and freelance projects, in software engineering, Oracle Fusion HCM or QA.',
    ar: () => 'إيه متاح! يدوّر وظيفة دوام كامل، ويقبل مشاريع عمل حر، في البرمجة أو Oracle Fusion HCM أو اختبار الجودة.' },
  { id: 'remote', g: 'avail', w: ['remote', 'on site', 'on-site', 'onsite', 'hybrid', 'relocate', 'عن بعد', 'حضوري', 'هجين', 'ينتقل'],
    en: () => 'He works on-site in Riyadh, hybrid, or remote. He has already worked fully remotely, from Malaysia, for a company based in Doha.',
    ar: () => 'يمشي معه كله: حضوري في الرياض، أو هجين، أو عن بُعد. وسبق اشتغل عن بُعد وزبط.' },
  { id: 'reply', g: 'contact', w: ['reply', 'respond', 'response time', 'how fast', 'يرد', 'متى يرد', 'سرعه الرد'],
    en: () => 'Email is the fastest way to reach him. Outside working hours, he replies the next working day.',
    ar: () => 'الإيميل أسرع شي. وإذا راسلته بعد الدوام يرد عليك ثاني يوم.' },
  { id: 'why', g: 'why', mood: 'happy', w: ['why hire', 'why should', 'strength', 'what makes', 'special', 'unique', 'ليش اوظفه', 'ليش اختاره', 'الفرق بينه', 'يميزه عن غيره', 'مميزاته', 'نقاط قوته', 'وش يميزه', 'ليش احمد'],
    en: () => 'He sits between code and configuration: he can build a full product and also set up an enterprise HR system. And he likes hunting the edge case nobody thought of before users find it.',
    ar: () => 'لأنه يجمع الثنتين: يبرمج منتج كامل، ويضبط نظام موارد بشرية لشركة. ويحب يلقط الأخطاء الغريبة قبل ما توصل للمستخدم.' },
  { id: 'stats', g: 'stats', w: ['numbers', 'stats', 'how many projects', 'how many certificates', 'how many countries', 'ارقام', 'كم مشروع', 'كم شهاده', 'كم دوله'],
    en: () => 'In numbers: 3 shipped projects, 5 certifications, 6 Oracle HCM modules configured, and 2 countries he has lived and studied in: Saudi Arabia and Malaysia. He also worked remotely for a company based in Qatar.',
    ar: () => 'بالأرقام: 3 مشاريع، 5 شهادات، 6 وحدات Oracle HCM، ودولتين عاش ودرس فيها: السعودية وماليزيا.' },
  { id: 'private', g: 'private', mood: 'sorry', w: ['married', 'wife', 'girlfriend', 'single', 'family', 'father', 'mother', 'brother', 'sister', 'salary', 'religion', 'phone number', 'whatsapp', 'address', 'home', 'متزوج', 'زوجته', 'اعزب', 'اهله', 'عائلته', 'ابوه', 'امه', 'اخوه', 'اخته', 'راتبه', 'راتب', 'ديانته', 'رقمه', 'رقم جواله', 'واتساب', 'عنوانه', 'بيته'],
    en: () => 'That’s personal, so I don’t share it. I stick to Ahmed’s professional side. For anything else, the best way is to email him at aaa.bawazir0@gmail.com.',
    ar: () => 'هذي أمور شخصية، ما أتكلم فيها 🙏 أنا أعرف عن شغل أحمد بس. ولو تبي شي ثاني راسله على aaa.bawazir0@gmail.com.' },
  { id: 'hobby', g: 'private', mood: 'sorry', w: ['hobby', 'hobbies', 'free time', 'favorite', 'favourite', 'هواياته', 'هوايه', 'وقت فراغه', 'يحب', 'المفضل'],
    en: () => 'I only have Ahmed’s professional information, so I can’t speak for his hobbies. You could ask him yourself, he’s easy to reach by email.',
    ar: () => 'ما عندي غير معلومات شغله، فهواياته اسأله عنها بنفسك 😄' },
  { id: 'cv', g: 'cv', act: 'cv', w: ['cv', 'resume', 'résumé', 'سيره', 'السيره', 'سيرته', 'سي في'],
    en: () => 'Here’s Ahmed’s CV, downloading now.',
    ar: () => 'أبشر، هذي سيرته تتحمّل الحين.' },
  { id: 'intro', g: 'intro', act: 'intro', w: ['intro', 'video', 'film', 'watch', 'فيديو', 'المقطع', 'الفيلم', 'التعريف', 'شغل الفيديو'],
    en: () => 'Playing the 85-second intro.',
    ar: () => 'أبشر، هذا فيلم التعريف، 85 ثانية.' },
  { id: 'dark', g: 'cmd', act: 'dark', w: ['dark mode', 'dark theme', 'night mode', 'الوضع الداكن', 'الوضع الليلي', 'داكن', 'غامق'],
    en: () => 'Done, dark mode.', ar: () => 'تم، الوضع الداكن.' },
  { id: 'light', g: 'cmd', act: 'light', w: ['light mode', 'light theme', 'الوضع الفاتح', 'فاتح', 'نهاري'],
    en: () => 'Done, light mode.', ar: () => 'تم، الوضع الفاتح.' },
  { id: 'break', g: 'cmd', act: 'break', w: ['break the page', 'break this page', 'break it', 'اكسر', 'كسر الصفحه'],
    en: () => 'Okay… breaking the page. Don’t worry, it fixes itself.', ar: () => 'طيب… بكسر الصفحة. لا تخاف، ترجع لحالها.' },
  { id: 'ok', g: 'chat', mood: 'happy', w: ['okay', 'ok', 'alright', 'got it', 'تمام', 'اوكي', 'طيب', 'زين', 'فهمت'],
    en: () => 'Great. Anything else about Ahmed?', ar: () => 'تمام 👌 فيه شي ثاني عن أحمد؟' },
  { id: 'thanks', g: 'chat', mood: 'happy', w: ['thanks', 'thank you', 'thx', 'great', 'awesome', 'nice', 'cool', 'perfect', 'شكرا', 'يعطيك العافيه', 'تسلم', 'مشكور', 'حلو', 'رهيب', 'كفو', 'ممتاز'],
    en: () => 'My pleasure! Anything else you’d like to know about Ahmed?',
    ar: () => 'العفو، حيّاك! فيه شي ثاني ودّك تعرفه؟' },
  { id: 'bye', g: 'chat', mood: 'happy', w: ['bye', 'goodbye', 'see you', 'مع السلامه', 'باي', 'في امان الله'],
    en: () => 'Thanks for stopping by! Don’t forget to say hi to Ahmed.',
    ar: () => 'نوّرت! ولا تنسى تسلّم على أحمد 👋' },
];

/* ── matching ── */
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// A single English word matches as a whole word (with a plural/tense ending), so "network"
// never triggers "work". Phrases and Arabic match as written.
T.forEach(tp => { tp.m = tp.w.map(w => { const n = norm(w).trim();
  if (/^[a-zé-]+$/.test(n)) return { re: new RegExp('(^| )' + esc(n) + '(s|es|ed|ing|y|ies)?( |$)'), len: n.length };
  if (!n.includes(' ') && n.length <= 4) return { re: new RegExp('(^| )(و|ف|ب|ل|ال)?' + esc(n) + '( |$)'), len: n.length }; // short Arabic words: whole word only
  return { s: n, len: n.length }; }); });
const score = (tp, t) => tp.m.reduce((a, m) => a + ((m.re ? m.re.test(t) : t.includes(m.s)) ? m.len : 0), 0);

const MORE = ['more', 'tell me more', 'and', 'what else', 'go on', 'details', 'continue', 'زياده', 'كمل', 'بعد', 'وبعدين', 'وش بعد', 'تفاصيل', 'اكثر', 'زود'];
const isMore = t => t.trim().split(' ').length <= 4 && MORE.some(w => t.includes(' ' + norm(w).trim() + ' '));

// Staying on topic. ABOUT = the message refers to Ahmed (or to AB itself).
const ABOUT = / (ahmed|bawazir|he|his|him|you|your|ab|احمد|باوزير|هو|انت|معه|عنه|له|عنده|فيه) /;
// Never AB's business, whoever it is about.
const NEVER = ['weather', 'news', 'politic', 'election', 'bitcoin', 'crypto', 'stock', 'football', 'soccer', 'match score', 'recipe', 'joke', 'poem', 'song', 'movie', 'horoscope', 'medical', 'doctor', 'lawyer', 'homework', 'طقس', 'الجو', 'اخبار اليوم', 'سياسه', 'انتخابات', 'بتكوين', 'اسهم', 'مباراه', 'كوره', 'طبخه', 'وصفه', 'نكته', 'قصيده', 'اغنيه', 'فيلم سينما', 'ابراج', 'دكتور', 'واجب'];
// Requests for general help: off topic unless they are about Ahmed.
const GENERAL = ['how does a', 'how does an', 'how does the', 'how do ', 'why is', 'why do', 'how to', 'how do i', 'how can i', 'how do you', 'explain', 'write me', 'write a', 'write code', 'code for', 'translate', 'define', 'definition', 'solve', 'calculate', 'what is a', 'what is the', 'what are', 'teach me', 'help me with', 'recommend', 'best way to', 'difference between', 'tutorial', 'fix my', 'debug my', 'كيف اسوي', 'كيف اتعلم', 'كيف اقدر', 'اشرح', 'اكتب لي', 'اكتب كود', 'ترجم', 'عرف لي', 'حل لي', 'احسب', 'علمني', 'ساعدني في', 'انصحني', 'افضل طريقه', 'الفرق بين', 'وش هو ال', 'ما هو ال', 'ما هي ال'];
const has = (list, t) => list.some(w => t.includes(norm(w).trim()));
// "who is X" / "مين X" about someone who is not Ahmed
const otherPerson = t => (/ who(s| is| was| are) (?!ahmed|he |him|bawazir|this|ab |you|the owner|behind)/.test(t)) || (/ (مين|من هو|من هي|منهو) (?!احمد|هو |باوزير|انت|صاحب|سواك|صنعك)/.test(t));

const OFF = {
  en: 'That’s outside what I do. I’m here only to talk about Ahmed. Ask me about his studies, his experience, his projects, his skills, or how to reach him.',
  ar: 'هذا بعيد عني 😅 أنا أعرف عن أحمد بس. اسألني عن دراسته، شغله، مشاريعه، أو كيف توصله.',
};
const FALLBACK = {
  en: 'I don’t have that about Ahmed, and I’d rather not guess. I can tell you when he was born, where he studied, his experience, his projects, or how to contact him.',
  ar: 'ما عندي معلومة عن هذا، وما أحب أخمّن. جرّب تسألني: وين درس؟ وش خبراته؟ وش مشاريعه؟',
};
const NOMORE = {
  en: 'That’s the main part. Want to hear about his experience, his projects, or how to reach him?',
  ar: 'هذا أهم شي. تبي أكلمك عن شغله، أو مشاريعه، أو كيف توصله؟',
};
const TECH = ['python', 'django', 'flask', 'angular', 'vue', 'svelte', 'kotlin', 'swift', 'flutter', 'go', 'golang', 'rust', 'ruby', 'rails', 'laravel', 'aws', 'azure', 'gcp', 'kubernetes', 'sap', 'salesforce', 'بايثون', 'جافا سكربت', 'فلاتر', 'سويفت', 'كوتلن'];
const KNOWN = ['java', 'javascript', 'c#', 'c++', 'php', 'react', 'next', 'node', 'tailwind', 'postgres', 'mysql', 'oracle', 'supabase', 'docker', 'figma', 'tableau', 'sql', 'maui', 'firebase', 'groovy', 'flutter', 'dart', 'riverpod', 'git', 'github', 'codemagic', 'sqlite', 'gemini', 'فلاتر', 'جافا', 'رياكت'];
const NOTECH = { en: 'That one isn’t in Ahmed’s listed stack. He works with Java, C#, JavaScript, PHP, React, Next.js, Node.js and SQL databases, and he picks up new tools fast.', ar: 'هذي مو من الأدوات اللي ذكرها أحمد. هو يشتغل بـ Java وC# وJavaScript وPHP وReact وNext.js وقواعد بيانات SQL، ويتعلّم الجديد بسرعة.' };
export const SUGGEST = {
  en: ['Who is Ahmed?', 'Where did he study?', 'His experience', 'Projects', 'Is he available?', 'Contact'],
  ar: ['مين أحمد؟', 'وين درس؟', 'خبراته', 'المشاريع', 'هل هو متاح؟', 'التواصل'],
};

let last = null;
const isAr = s => /[؀-ۿ]/.test(s);

function rank(t) {
  return T.map(tp => ({ tp, s: score(tp, t) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
}
function offTopic(t, ranked) {
  if (has(NEVER, t) || otherPerson(t)) return true;
  // a specific thing of Ahmed's (Codai, UNITEN, Macquires…) keeps a general-sounding question on topic
  const specific = ranked.some(x => ['codai', 'ufc', 'easycal', 'sifr', 'hcm', 'cmd'].includes(x.tp.id) || x.tp.g === 'cmd');
  const strong = ranked.some(x => x.tp.g !== 'chat' && x.s >= 7); // clearly about one of Ahmed's topics
  return has(GENERAL, t) && !ABOUT.test(t) && !specific && !strong;
}

/** Answer one visitor message. Returns { text, lang, act, mood }. */
export function answer(input, pageLang) {
  const lang = isAr(input) ? 'ar' : /[a-z]/i.test(input) ? 'en' : pageLang;
  const t = norm(input);
  const ranked = rank(t);
  if (last && !ranked.length && isMore(t)) { const r = last.more ? last.more[lang]() : NOMORE[lang]; last = null; return { text: r, lang, mood: 'talk' }; }
  if (offTopic(t, ranked)) { last = null; return { text: OFF[lang], lang, mood: 'sorry' }; }
  if (TECH.some(w => new RegExp('(^| )' + esc(norm(w).trim()) + '( |$)').test(t)) && !KNOWN.some(w => t.includes(' ' + norm(w).trim()))) { last = null; return { text: NOTECH[lang], lang, mood: 'sorry' }; }
  if (!ranked.length) { last = null; return { text: FALLBACK[lang], lang, mood: 'sorry' }; }
  const best = ranked[0].tp; last = best;
  let text = best[lang](), act = best.act;
  // a second, different question in the same message
  // only when the visitor really asked two things ("… and …" / «… و…»)
  const two = / (and|also|plus) /.test(t) || /\S (?!وين |وش |وشو )و\S/.test(t);
  const second = two && ranked.find(x => x.tp.g !== best.g && x.s >= 4 && !['chat', 'cmd', 'who'].includes(x.tp.g) && !['chat', 'cmd'].includes(best.g));
  if (second) { text += ' ' + second.tp[lang](); act = act || second.tp.act; }
  return { text, lang, act, mood: best.mood || 'talk' };
}

/** True when the message is something AB should answer in the chat (used by voice routing). */
export function knows(input) {
  const t = norm(input);
  const ranked = rank(t);
  if (last && !ranked.length && isMore(t)) return true;
  return ranked.length > 0 || offTopic(t, ranked);
}
