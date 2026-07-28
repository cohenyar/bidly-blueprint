-- Compact Hebrew MVP reference catalog.
-- This migration adds taxonomy and questionnaire definitions only. Existing
-- rows are preserved, and stable slug conflicts are intentionally left intact.

BEGIN;

WITH category_seed (slug, name_he, sort_order) AS (
  VALUES
    ('construction-renovation', 'בנייה ושיפוצים', 10),
    ('electrical-plumbing', 'חשמל ואינסטלציה', 20),
    ('cleaning-maintenance', 'ניקיון ותחזוקה', 30),
    ('moving-logistics', 'הובלות ולוגיסטיקה', 40),
    ('digital-marketing', 'דיגיטל ושיווק', 50),
    ('events-photography', 'אירועים וצילום', 60),
    ('automotive', 'רכב', 70),
    ('lessons-professional-services', 'שיעורים ושירותים מקצועיים', 80)
)
INSERT INTO public.categories (slug, name_he, sort_order)
SELECT seed.slug, seed.name_he, seed.sort_order
FROM category_seed seed
ON CONFLICT (slug) DO NOTHING;

WITH subcategory_seed (category_slug, slug, name_he, sort_order) AS (
  VALUES
    ('construction-renovation', 'general-renovation', 'שיפוץ כללי', 10),
    ('construction-renovation', 'painting-drywall', 'צבע וגבס', 20),
    ('construction-renovation', 'flooring-tiling', 'ריצוף וחיפוי', 30),
    ('electrical-plumbing', 'electricians', 'חשמלאות', 10),
    ('electrical-plumbing', 'plumbing', 'אינסטלציה', 20),
    ('electrical-plumbing', 'air-conditioning', 'מיזוג אוויר', 30),
    ('cleaning-maintenance', 'home-cleaning', 'ניקיון בתים', 10),
    ('cleaning-maintenance', 'building-maintenance', 'תחזוקת מבנים וגינות', 20),
    ('cleaning-maintenance', 'pest-control', 'הדברה', 30),
    ('moving-logistics', 'moving', 'הובלות', 10),
    ('moving-logistics', 'deliveries', 'שליחויות והפצה', 20),
    ('moving-logistics', 'storage-packing', 'אריזה ואחסון', 30),
    ('digital-marketing', 'web-development', 'בניית אתרים', 10),
    ('digital-marketing', 'digital-promotion', 'שיווק דיגיטלי', 20),
    ('digital-marketing', 'graphic-design', 'עיצוב גרפי', 30),
    ('events-photography', 'event-photography', 'צילום אירועים', 10),
    ('events-photography', 'video-production', 'וידאו ועריכה', 20),
    ('events-photography', 'event-services', 'שירותי אירועים', 30),
    ('automotive', 'auto-repair', 'מכונאות ואבחון', 10),
    ('automotive', 'auto-body', 'פחחות וזגגות', 20),
    ('automotive', 'vehicle-services', 'שירותי דרך וטיפוח רכב', 30),
    ('lessons-professional-services', 'private-lessons', 'שיעורים פרטיים', 10),
    ('lessons-professional-services', 'business-services', 'שירותים לעסקים', 20),
    ('lessons-professional-services', 'translation-editing', 'תרגום ועריכה', 30)
)
INSERT INTO public.subcategories (category_id, slug, name_he, sort_order)
SELECT category_row.id, seed.slug, seed.name_he, seed.sort_order
FROM subcategory_seed seed
JOIN public.categories category_row
  ON category_row.slug = seed.category_slug
ON CONFLICT (category_id, slug) DO NOTHING;

WITH service_seed (
  category_slug,
  subcategory_slug,
  slug,
  name_he,
  sort_order
) AS (
  VALUES
    ('construction-renovation', 'general-renovation', 'apartment-renovation', 'שיפוץ דירה', 10),
    ('construction-renovation', 'general-renovation', 'room-renovation', 'שיפוץ חדר', 20),
    ('construction-renovation', 'general-renovation', 'commercial-renovation', 'שיפוץ עסק', 30),
    ('construction-renovation', 'painting-drywall', 'interior-painting', 'צביעת פנים', 10),
    ('construction-renovation', 'painting-drywall', 'exterior-painting', 'צביעת חוץ', 20),
    ('construction-renovation', 'painting-drywall', 'drywall-construction', 'עבודות גבס', 30),
    ('construction-renovation', 'flooring-tiling', 'floor-installation', 'התקנת ריצוף', 10),
    ('construction-renovation', 'flooring-tiling', 'tile-repair', 'תיקון והחלפת אריחים', 20),
    ('construction-renovation', 'flooring-tiling', 'wall-cladding', 'חיפוי קירות', 30),

    ('electrical-plumbing', 'electricians', 'electrical-repair', 'תיקון תקלת חשמל', 10),
    ('electrical-plumbing', 'electricians', 'electrical-installation', 'התקנת נקודות ולוחות חשמל', 20),
    ('electrical-plumbing', 'electricians', 'electrical-inspection', 'בדיקת מערכת חשמל', 30),
    ('electrical-plumbing', 'plumbing', 'leak-repair', 'איתור ותיקון נזילה', 10),
    ('electrical-plumbing', 'plumbing', 'pipe-installation', 'התקנת והחלפת צנרת', 20),
    ('electrical-plumbing', 'plumbing', 'drain-unclogging', 'פתיחת סתימות', 30),
    ('electrical-plumbing', 'air-conditioning', 'ac-installation', 'התקנת מזגן', 10),
    ('electrical-plumbing', 'air-conditioning', 'ac-repair', 'תיקון מזגן', 20),
    ('electrical-plumbing', 'air-conditioning', 'ac-maintenance', 'ניקוי ותחזוקת מזגן', 30),

    ('cleaning-maintenance', 'home-cleaning', 'regular-home-cleaning', 'ניקיון בית שוטף', 10),
    ('cleaning-maintenance', 'home-cleaning', 'deep-cleaning', 'ניקיון יסודי', 20),
    ('cleaning-maintenance', 'home-cleaning', 'move-cleaning', 'ניקיון לפני או אחרי מעבר', 30),
    ('cleaning-maintenance', 'building-maintenance', 'handyman', 'הנדימן ותיקונים קטנים', 10),
    ('cleaning-maintenance', 'building-maintenance', 'building-maintenance-service', 'תחזוקת בניין', 20),
    ('cleaning-maintenance', 'building-maintenance', 'garden-maintenance', 'תחזוקת גינה', 30),
    ('cleaning-maintenance', 'pest-control', 'home-pest-control', 'הדברת מזיקים בבית', 10),
    ('cleaning-maintenance', 'pest-control', 'termite-treatment', 'טיפול בטרמיטים', 20),
    ('cleaning-maintenance', 'pest-control', 'rodent-control', 'הרחקת מכרסמים', 30),

    ('moving-logistics', 'moving', 'apartment-moving', 'הובלת דירה', 10),
    ('moving-logistics', 'moving', 'office-moving', 'הובלת משרד', 20),
    ('moving-logistics', 'moving', 'small-moving', 'הובלה קטנה', 30),
    ('moving-logistics', 'deliveries', 'courier-delivery', 'שליחות נקודתית', 10),
    ('moving-logistics', 'deliveries', 'furniture-delivery', 'הובלת רהיט או מוצר גדול', 20),
    ('moving-logistics', 'deliveries', 'business-distribution', 'הפצה לעסקים', 30),
    ('moving-logistics', 'storage-packing', 'packing-service', 'שירותי אריזה', 10),
    ('moving-logistics', 'storage-packing', 'storage-service', 'אחסון תכולה', 20),
    ('moving-logistics', 'storage-packing', 'moving-crane', 'מנוף להובלה', 30),

    ('digital-marketing', 'web-development', 'business-website', 'אתר תדמית', 10),
    ('digital-marketing', 'web-development', 'online-store', 'חנות מקוונת', 20),
    ('digital-marketing', 'web-development', 'landing-page', 'דף נחיתה', 30),
    ('digital-marketing', 'digital-promotion', 'social-media-management', 'ניהול רשתות חברתיות', 10),
    ('digital-marketing', 'digital-promotion', 'paid-advertising', 'פרסום ממומן', 20),
    ('digital-marketing', 'digital-promotion', 'seo', 'קידום אורגני', 30),
    ('digital-marketing', 'graphic-design', 'logo-design', 'עיצוב לוגו', 10),
    ('digital-marketing', 'graphic-design', 'marketing-design', 'עיצוב חומרי שיווק', 20),
    ('digital-marketing', 'graphic-design', 'presentation-design', 'עיצוב מצגת', 30),

    ('events-photography', 'event-photography', 'wedding-photography', 'צילום חתונה', 10),
    ('events-photography', 'event-photography', 'business-event-photography', 'צילום אירוע עסקי', 20),
    ('events-photography', 'event-photography', 'family-event-photography', 'צילום אירוע משפחתי', 30),
    ('events-photography', 'video-production', 'event-video', 'צילום וידאו לאירוע', 10),
    ('events-photography', 'video-production', 'promotional-video', 'סרטון תדמית', 20),
    ('events-photography', 'video-production', 'video-editing', 'עריכת וידאו', 30),
    ('events-photography', 'event-services', 'event-production', 'הפקת אירוע', 10),
    ('events-photography', 'event-services', 'dj-service', 'די-ג׳יי לאירוע', 20),
    ('events-photography', 'event-services', 'catering-service', 'קייטרינג לאירוע', 30),

    ('automotive', 'auto-repair', 'mechanical-repair', 'תיקון מכני', 10),
    ('automotive', 'auto-repair', 'vehicle-diagnostics', 'אבחון תקלה ברכב', 20),
    ('automotive', 'auto-repair', 'pre-purchase-inspection', 'בדיקה לפני קנייה', 30),
    ('automotive', 'auto-body', 'body-repair', 'תיקון פחחות', 10),
    ('automotive', 'auto-body', 'car-painting', 'צביעת רכב', 20),
    ('automotive', 'auto-body', 'windshield-replacement', 'תיקון או החלפת שמשה', 30),
    ('automotive', 'vehicle-services', 'mobile-tire-service', 'שירות צמיגים נייד', 10),
    ('automotive', 'vehicle-services', 'car-detailing', 'דיטיילינג וניקוי רכב', 20),
    ('automotive', 'vehicle-services', 'vehicle-towing', 'גרירת רכב', 30),

    ('lessons-professional-services', 'private-lessons', 'math-tutoring', 'שיעורים פרטיים במתמטיקה', 10),
    ('lessons-professional-services', 'private-lessons', 'english-tutoring', 'שיעורים פרטיים באנגלית', 20),
    ('lessons-professional-services', 'private-lessons', 'language-lessons', 'לימוד שפות', 30),
    ('lessons-professional-services', 'business-services', 'bookkeeping', 'הנהלת חשבונות', 10),
    ('lessons-professional-services', 'business-services', 'tax-consulting', 'ייעוץ מס', 20),
    ('lessons-professional-services', 'business-services', 'business-consulting', 'ייעוץ עסקי', 30),
    ('lessons-professional-services', 'translation-editing', 'document-translation', 'תרגום מסמכים', 10),
    ('lessons-professional-services', 'translation-editing', 'content-editing', 'עריכת תוכן', 20),
    ('lessons-professional-services', 'translation-editing', 'proofreading', 'הגהה לשונית', 30)
)
INSERT INTO public.services (subcategory_id, slug, name_he, sort_order)
SELECT subcategory_row.id, seed.slug, seed.name_he, seed.sort_order
FROM service_seed seed
JOIN public.categories category_row
  ON category_row.slug = seed.category_slug
JOIN public.subcategories subcategory_row
  ON subcategory_row.category_id = category_row.id
 AND subcategory_row.slug = seed.subcategory_slug
ON CONFLICT (subcategory_id, slug) DO NOTHING;

WITH question_seed (
  category_slug,
  subcategory_slug,
  service_slug,
  field_type,
  prompt_he,
  options
) AS (
  VALUES
    ('construction-renovation', 'general-renovation', 'apartment-renovation', 'single_choice', 'מה היקף שיפוץ הדירה?', '["חדר אחד","מספר חדרים","שיפוץ מלא"]'),
    ('construction-renovation', 'general-renovation', 'room-renovation', 'single_choice', 'איזה חדר מיועד לשיפוץ?', '["מטבח","חדר רחצה","חדר מגורים או שינה","אחר"]'),
    ('construction-renovation', 'general-renovation', 'commercial-renovation', 'single_choice', 'מה גודל העסק המשוער?', '["עד 50 מ״ר","50–150 מ״ר","מעל 150 מ״ר"]'),
    ('construction-renovation', 'painting-drywall', 'interior-painting', 'single_choice', 'כמה חדרים מיועדים לצביעה?', '["חדר אחד","2–3 חדרים","4 חדרים ומעלה","כל הנכס"]'),
    ('construction-renovation', 'painting-drywall', 'exterior-painting', 'single_choice', 'מה סוג השטח החיצוני?', '["קיר או חזית קטנה","חזית בית פרטי","בניין משותף"]'),
    ('construction-renovation', 'painting-drywall', 'drywall-construction', 'single_choice', 'איזו עבודת גבס נדרשת?', '["מחיצה","תקרה או הנמכה","נישה או עיצוב","תיקון"]'),
    ('construction-renovation', 'flooring-tiling', 'floor-installation', 'single_choice', 'מה שטח הריצוף המשוער?', '["עד 20 מ״ר","20–60 מ״ר","מעל 60 מ״ר"]'),
    ('construction-renovation', 'flooring-tiling', 'tile-repair', 'single_choice', 'כמה אריחים דורשים טיפול?', '["אריחים בודדים","אזור קטן","חדר שלם"]'),
    ('construction-renovation', 'flooring-tiling', 'wall-cladding', 'single_choice', 'היכן נדרש החיפוי?', '["מטבח","חדר רחצה","קיר פנים","קיר חוץ"]'),

    ('electrical-plumbing', 'electricians', 'electrical-repair', 'single_choice', 'מה דחיפות תקלת החשמל?', '["מיידית","היום","בימים הקרובים"]'),
    ('electrical-plumbing', 'electricians', 'electrical-installation', 'single_choice', 'מה היקף ההתקנה?', '["נקודה אחת","מספר נקודות","לוח או תשתית"]'),
    ('electrical-plumbing', 'electricians', 'electrical-inspection', 'single_choice', 'מה מטרת הבדיקה?', '["תקלה חוזרת","לפני רכישה או שכירות","בדיקה תקופתית"]'),
    ('electrical-plumbing', 'plumbing', 'leak-repair', 'single_choice', 'האם מקור הנזילה ידוע?', '["כן","לא","נדרש איתור מקצועי"]'),
    ('electrical-plumbing', 'plumbing', 'pipe-installation', 'single_choice', 'מה היקף עבודת הצנרת?', '["נקודה אחת","חדר אחד","תשתית רחבה"]'),
    ('electrical-plumbing', 'plumbing', 'drain-unclogging', 'single_choice', 'היכן הסתימה?', '["כיור","אסלה","מקלחת או אמבטיה","קו ראשי"]'),
    ('electrical-plumbing', 'air-conditioning', 'ac-installation', 'single_choice', 'איזה סוג מזגן מיועד להתקנה?', '["עילי","מיני מרכזי","מערכת אחרת","טרם נבחר"]'),
    ('electrical-plumbing', 'air-conditioning', 'ac-repair', 'single_choice', 'מה התקלה העיקרית?', '["לא מקרר או מחמם","נזילה","רעש","לא נדלק"]'),
    ('electrical-plumbing', 'air-conditioning', 'ac-maintenance', 'single_choice', 'כמה יחידות דורשות תחזוקה?', '["יחידה אחת","2–3 יחידות","4 יחידות ומעלה"]'),

    ('cleaning-maintenance', 'home-cleaning', 'regular-home-cleaning', 'single_choice', 'מה גודל הבית?', '["עד 2 חדרים","3–4 חדרים","5 חדרים ומעלה"]'),
    ('cleaning-maintenance', 'home-cleaning', 'deep-cleaning', 'single_choice', 'מה מוקד הניקיון היסודי?', '["כל הבית","מטבח","חדרי רחצה","אחרי שיפוץ"]'),
    ('cleaning-maintenance', 'home-cleaning', 'move-cleaning', 'single_choice', 'מתי נדרש הניקיון?', '["לפני כניסה","אחרי פינוי","אחרי שיפוץ"]'),
    ('cleaning-maintenance', 'building-maintenance', 'handyman', 'single_choice', 'כמה משימות קטנות נדרשות?', '["משימה אחת","2–4 משימות","5 משימות ומעלה"]'),
    ('cleaning-maintenance', 'building-maintenance', 'building-maintenance-service', 'single_choice', 'איזה שירות תחזוקה נדרש?', '["ביקור חד-פעמי","תחזוקה חודשית","טיפול בתקלה"]'),
    ('cleaning-maintenance', 'building-maintenance', 'garden-maintenance', 'single_choice', 'מה גודל הגינה?', '["קטנה","בינונית","גדולה"]'),
    ('cleaning-maintenance', 'pest-control', 'home-pest-control', 'single_choice', 'איזה מזיק זוהה?', '["תיקנים","נמלים","פרעושים","אחר או לא ידוע"]'),
    ('cleaning-maintenance', 'pest-control', 'termite-treatment', 'single_choice', 'היכן נראו סימני טרמיטים?', '["רהיט","חדר אחד","מספר אזורים","לא בטוח"]'),
    ('cleaning-maintenance', 'pest-control', 'rodent-control', 'single_choice', 'היכן נצפתה פעילות מכרסמים?', '["דירה","בית פרטי","חצר","עסק או מחסן"]'),

    ('moving-logistics', 'moving', 'apartment-moving', 'single_choice', 'כמה חדרים בדירה?', '["1–2 חדרים","3–4 חדרים","5 חדרים ומעלה"]'),
    ('moving-logistics', 'moving', 'office-moving', 'single_choice', 'מה גודל המשרד?', '["עד 5 עמדות","6–20 עמדות","מעל 20 עמדות"]'),
    ('moving-logistics', 'moving', 'small-moving', 'single_choice', 'כמה פריטים יש להוביל?', '["פריט אחד","2–5 פריטים","6 פריטים ומעלה"]'),
    ('moving-logistics', 'deliveries', 'courier-delivery', 'single_choice', 'מה דחיפות השליחות?', '["מהיום להיום","ליום הבא","גמיש"]'),
    ('moving-logistics', 'deliveries', 'furniture-delivery', 'single_choice', 'האם נדרשת סבלות במדרגות?', '["לא","כן, קומה נמוכה","כן, קומה גבוהה","לא ידוע"]'),
    ('moving-logistics', 'deliveries', 'business-distribution', 'single_choice', 'כמה נקודות חלוקה נדרשות?', '["עד 5","6–20","מעל 20"]'),
    ('moving-logistics', 'storage-packing', 'packing-service', 'single_choice', 'מה היקף האריזה?', '["חדר אחד","דירה קטנה","דירה גדולה או משרד"]'),
    ('moving-logistics', 'storage-packing', 'storage-service', 'single_choice', 'לכמה זמן נדרש האחסון?', '["עד חודש","1–6 חודשים","מעל חצי שנה"]'),
    ('moving-logistics', 'storage-packing', 'moving-crane', 'single_choice', 'לאיזו קומה נדרש המנוף?', '["1–3","4–7","8 ומעלה"]'),

    ('digital-marketing', 'web-development', 'business-website', 'single_choice', 'כמה עמודים צפויים באתר?', '["עמוד אחד","2–5 עמודים","6 עמודים ומעלה"]'),
    ('digital-marketing', 'web-development', 'online-store', 'single_choice', 'כמה מוצרים צפויים בחנות?', '["עד 20","21–100","מעל 100"]'),
    ('digital-marketing', 'web-development', 'landing-page', 'single_choice', 'מה מטרת דף הנחיתה?', '["השארת פרטים","מכירה","הרשמה","הצגת שירות"]'),
    ('digital-marketing', 'digital-promotion', 'social-media-management', 'multiple_choice', 'באילו פלטפורמות נדרש ניהול?', '["פייסבוק","אינסטגרם","טיקטוק","לינקדאין"]'),
    ('digital-marketing', 'digital-promotion', 'paid-advertising', 'multiple_choice', 'באילו ערוצים נדרש פרסום?', '["Google","Meta","TikTok","LinkedIn"]'),
    ('digital-marketing', 'digital-promotion', 'seo', 'single_choice', 'מה מצב האתר כיום?', '["אתר חדש","אתר פעיל ללא קידום","אתר שכבר מקודם"]'),
    ('digital-marketing', 'graphic-design', 'logo-design', 'single_choice', 'האם קיים כיוון עיצובי?', '["כן, יש בריף","יש רעיון כללי","נדרש פיתוח כיוון מלא"]'),
    ('digital-marketing', 'graphic-design', 'marketing-design', 'multiple_choice', 'אילו תוצרים נדרשים?', '["מודעות דיגיטליות","דפוס","רשתות חברתיות","דיוור"]'),
    ('digital-marketing', 'graphic-design', 'presentation-design', 'single_choice', 'כמה שקופיות צפויות?', '["עד 10","11–25","מעל 25"]'),

    ('events-photography', 'event-photography', 'wedding-photography', 'single_choice', 'איזה היקף צילום נדרש?', '["טקס בלבד","אירוע מלא","אירוע מלא וצילומי זוג"]'),
    ('events-photography', 'event-photography', 'business-event-photography', 'single_choice', 'כמה משתתפים צפויים?', '["עד 50","51–200","מעל 200"]'),
    ('events-photography', 'event-photography', 'family-event-photography', 'single_choice', 'מה סוג האירוע?', '["בר או בת מצווה","ברית או בריתה","יום הולדת","אירוע אחר"]'),
    ('events-photography', 'video-production', 'event-video', 'single_choice', 'איזה תוצר וידאו נדרש?', '["סרט מלא","סרטון תקציר","שניהם"]'),
    ('events-photography', 'video-production', 'promotional-video', 'single_choice', 'מה אורך הסרטון הרצוי?', '["עד דקה","1–3 דקות","מעל 3 דקות"]'),
    ('events-photography', 'video-production', 'video-editing', 'single_choice', 'כמה חומר גלם קיים?', '["עד שעה","1–5 שעות","מעל 5 שעות"]'),
    ('events-photography', 'event-services', 'event-production', 'single_choice', 'כמה אורחים צפויים?', '["עד 50","51–150","מעל 150"]'),
    ('events-photography', 'event-services', 'dj-service', 'single_choice', 'מה סוג האירוע?', '["חתונה","אירוע משפחתי","אירוע עסקי","מסיבה"]'),
    ('events-photography', 'event-services', 'catering-service', 'single_choice', 'כמה מנות נדרשות?', '["עד 30","31–100","מעל 100"]'),

    ('automotive', 'auto-repair', 'mechanical-repair', 'single_choice', 'האם הרכב כשיר לנסיעה?', '["כן","לא","לא בטוח"]'),
    ('automotive', 'auto-repair', 'vehicle-diagnostics', 'single_choice', 'איזה סימן תקלה הופיע?', '["נורת אזהרה","רעש או רעידות","ירידה בביצועים","אחר"]'),
    ('automotive', 'auto-repair', 'pre-purchase-inspection', 'single_choice', 'איזה סוג רכב נבדק?', '["פרטי","מסחרי","דו-גלגלי"]'),
    ('automotive', 'auto-body', 'body-repair', 'single_choice', 'מה היקף נזק הפחחות?', '["שריטה או מכה קטנה","חלק אחד","מספר חלקים"]'),
    ('automotive', 'auto-body', 'car-painting', 'single_choice', 'מה היקף הצביעה?', '["תיקון נקודתי","חלק אחד","צביעה מלאה"]'),
    ('automotive', 'auto-body', 'windshield-replacement', 'single_choice', 'איזו שמשה דורשת טיפול?', '["קדמית","אחורית","חלון צד","לא ידוע"]'),
    ('automotive', 'vehicle-services', 'mobile-tire-service', 'single_choice', 'מה נדרש בצמיגים?', '["תיקון תקר","החלפת צמיג","בדיקה","לא בטוח"]'),
    ('automotive', 'vehicle-services', 'car-detailing', 'single_choice', 'איזה טיפול נדרש?', '["פנים","חוץ","פנים וחוץ","פוליש"]'),
    ('automotive', 'vehicle-services', 'vehicle-towing', 'single_choice', 'מה מצב הרכב?', '["תקוע בצד הדרך","אחרי תאונה","לא מניע בחניה"]'),

    ('lessons-professional-services', 'private-lessons', 'math-tutoring', 'single_choice', 'מה רמת הלימוד?', '["יסודי","חטיבת ביניים","תיכון ובגרות","אקדמי"]'),
    ('lessons-professional-services', 'private-lessons', 'english-tutoring', 'single_choice', 'מה מטרת הלימוד?', '["בית ספר","שיחה","עסקים","מבחן"]'),
    ('lessons-professional-services', 'private-lessons', 'language-lessons', 'single_choice', 'מה רמת התלמיד?', '["מתחיל","ביניים","מתקדם"]'),
    ('lessons-professional-services', 'business-services', 'bookkeeping', 'single_choice', 'מה סוג הפעילות העסקית?', '["עוסק פטור","עוסק מורשה","חברה","עמותה"]'),
    ('lessons-professional-services', 'business-services', 'tax-consulting', 'single_choice', 'איזה ייעוץ מס נדרש?', '["פתיחת עסק","דוח שנתי","תכנון מס","בעיה נקודתית"]'),
    ('lessons-professional-services', 'business-services', 'business-consulting', 'single_choice', 'באיזה שלב נמצא העסק?', '["רעיון או הקמה","עסק פעיל","צמיחה","משבר או שינוי"]'),
    ('lessons-professional-services', 'translation-editing', 'document-translation', 'single_choice', 'מה היקף המסמך?', '["עד 5 עמודים","6–20 עמודים","מעל 20 עמודים"]'),
    ('lessons-professional-services', 'translation-editing', 'content-editing', 'single_choice', 'איזה תוכן דורש עריכה?', '["אתר","מאמר","מסמך עסקי","ספר או עבודה ארוכה"]'),
    ('lessons-professional-services', 'translation-editing', 'proofreading', 'single_choice', 'מה היקף הטקסט?', '["עד 1,000 מילים","1,001–5,000 מילים","מעל 5,000 מילים"]')
)
INSERT INTO public.request_questions (
  subcategory_id,
  service_id,
  field_type,
  prompt_he,
  is_required,
  sort_order,
  options
)
SELECT
  subcategory_row.id,
  service_row.id,
  seed.field_type,
  seed.prompt_he,
  true,
  10,
  seed.options::jsonb
FROM question_seed seed
JOIN public.categories category_row
  ON category_row.slug = seed.category_slug
JOIN public.subcategories subcategory_row
  ON subcategory_row.category_id = category_row.id
 AND subcategory_row.slug = seed.subcategory_slug
JOIN public.services service_row
  ON service_row.subcategory_id = subcategory_row.id
 AND service_row.slug = seed.service_slug
WHERE NOT EXISTS (
  SELECT 1
  FROM public.request_questions existing_question
  WHERE existing_question.subcategory_id = subcategory_row.id
    AND existing_question.service_id = service_row.id
    AND existing_question.prompt_he = seed.prompt_he
);

COMMIT;
