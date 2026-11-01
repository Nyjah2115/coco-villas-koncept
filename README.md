# Coco Villas: strona koncepcyjna

Zwykła strona w HTML, CSS i JavaScript. Nie trzeba niczego instalować ani budować.

Na żywo: https://nyjah2115.github.io/coco-villas-koncept/

## Jak otworzyć

W tym folderze uruchom `python3 -m http.server 8000` i otwórz http://localhost:8000. Formularz to wersja koncepcyjna: sprawdza pola i pokazuje podziękowanie, ale niczego nie wysyła.

## Co gdzie jest

- `index.html`: treść strony
- `styles.css`: wygląd w stylu apple.com: jasne tło, SF Pro na urządzeniach Apple (Inter na pozostałych), odrobina złota
- `app.js`: spacer po willi (miejsca, punkty i przejścia w `SCENES` i `CLIPS`), formularz
- `assets/scenes`: zdjęcia sześciu miejsc spaceru (klatki z przejść, 1920 i 1280 px)
- `assets/video`: przejścia kamery do przodu i od tyłu (`-r`), wersja na komputer i na telefon (`-m`)
- `assets/gallery`: dwa ujęcia bez przejść

Wizualizacje i dane pochodzą z ogłoszenia Twins Real Estate o Coco Villas na Instagramie. Przejścia kamery wygenerowano w Higgsfield na podstawie tych wizualizacji.
