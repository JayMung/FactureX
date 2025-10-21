<SelectContent>
              <SelectItem value="all">Toutes les villes</SelectItem>
              {Array.from(new Set(clients.map(c => c.ville))).map((city: string) => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>