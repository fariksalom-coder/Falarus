# 01 — Design system va UI primitivlar

> `CLAUDE.md` §7 ni asos qil.

## Vazifa
`src/components/ui/` da to'liq, qayta ishlatiladigan primitivlar kutubxonasi.

## Komponentlar

**Form**: Button (variant: primary/secondary/ghost/danger, size: sm/md/lg, loading, icon), Input, Textarea, Select, Checkbox, Radio, Switch, Slider, OTPInput, FileUpload, DatePicker, TimePicker

**Layout**: Card, Sheet (mobil bottom sheet), Modal, Drawer, Tabs, Accordion, Separator, ScrollArea

**Feedback**: Toast, Alert, Badge, Progress, Spinner, Skeleton, EmptyState, ErrorState, ConfirmDialog

**Data**: Avatar, Table, Pagination, Rating (yulduzcha), StatCard, Tooltip, Popover

**Ta'limga xos**: SubjectCard (fan rangi bilan), LessonCard, TutorCard, StreakFlame, XPBar, GradeChip, TimerRing

## Qat'iy talablar
- Har biri: hover, focus-visible, active, disabled holatlar
- Har biri klaviatura bilan to'liq boshqariladi
- Framer Motion: `whileTap={{ scale: 0.97 }}` bosiladigan elementlarda
- `prefers-reduced-motion` hurmat qilinadi
- Props typed, `any` yo'q, `forwardRef` kerak joyda
- Hech bir komponent ichida biznes logika yo'q — faqat prezentatsiya

## Yetkazma
- Har bir komponent uchun `.stories.tsx` yoki `/dev/ui` sahifasida jonli katalog
- Ikkinchi marta bir xil JSX yozilmasin — takrorlanish topilsa primitivga ko'chir
