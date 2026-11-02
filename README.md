# Coco Villas: strona koncepcyjna

Zwykła strona w HTML, CSS i JavaScript. Nie trzeba niczego instalować ani budować.

Na żywo: https://nyjah2115.github.io/coco-villas-koncept/

## Jak otworzyć

W tym folderze uruchom `python3 -m http.server 8000` i otwórz http://localhost:8000. Formularz to wersja koncepcyjna: sprawdza pola i pokazuje podziękowanie, ale niczego nie wysyła.

## Co gdzie jest

- `index.html`: treść strony
- `styles.css`: wygląd: hero z pierwszej wersji (ciemny, Cormorant Garamond i Manrope), reszta w ciepłym stylu studia (krem i brąz, Helvetica Neue / Inter Tight)
- `app.js`: spacer po willi (miejsca, punkty i przejścia w `SCENES` i `CLIPS`), formularz
- `assets/scenes`: zdjęcia sześciu miejsc spaceru (klatki z przejść, 1920 i 1280 px)
- `assets/video`: przejścia kamery do przodu i od tyłu (`-r`), wersja na komputer i na telefon (`-m`)
- `assets/gallery`: dwa ujęcia bez przejść (lista wnętrz pokazuje zdjęcie po najechaniu na wiersz)

Wizualizacje i dane pochodzą z ogłoszenia Twins Real Estate o Coco Villas na Instagramie. Przejścia kamery wygenerowano w Higgsfield na podstawie tych wizualizacji.
