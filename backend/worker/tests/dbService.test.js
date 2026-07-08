const dbService = require('../services/dbService');
const Candidato = require('../../models/Candidato');

jest.mock('../../models/Candidato');

describe('DbService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('pushNewsToCandidate debe retornar inmediatamente si el array de noticias es vacio o nulo', async () => {
    const resultNull = await dbService.pushNewsToCandidate('Test', null);
    const resultEmpty = await dbService.pushNewsToCandidate('Test', []);
    
    expect(resultNull).toBeUndefined();
    expect(resultEmpty).toBeUndefined();
    expect(Candidato.findOne).not.toHaveBeenCalled();
  });

  test('debe crear un candidato nuevo si no existe y guardar las noticias', async () => {
    Candidato.findOne.mockResolvedValueOnce(null);
    
    const mockSave = jest.fn().mockResolvedValue({
      nombre: 'Nuevo Candidato',
      historial_noticias: [{ enlace_origen: 'url1' }]
    });

    Candidato.mockImplementation(() => {
      return {
        nombre: 'Nuevo Candidato',
        historial_noticias: [],
        save: mockSave
      };
    });

    const newsArray = [{
      titular: 'T1',
      fecha: '2023-01-01',
      medio_prensa: 'Source',
      enlace_origen: 'url1',
      contenido_crudo: 'Content 1'
    }];

    await dbService.pushNewsToCandidate('Nuevo Candidato', newsArray);
    
    expect(Candidato.findOne).toHaveBeenCalledWith({ nombre: 'Nuevo Candidato' });
    expect(mockSave).toHaveBeenCalled();
  });

  test('debe evitar duplicar noticias si la URL ya existe en el historial', async () => {
    const mockCandidate = {
      nombre: 'Candidato Existente',
      historial_noticias: [{ enlace_origen: 'url_duplicate', contenido_crudo: 'Old content' }],
      save: jest.fn().mockResolvedValue(true)
    };
    Candidato.findOne.mockResolvedValueOnce(mockCandidate);

    const newsArray = [{
      titular: 'T1',
      fecha: '2023-01-01',
      medio_prensa: 'Source',
      enlace_origen: 'url_duplicate',
      contenido_crudo: 'New content'
    }];

    const result = await dbService.pushNewsToCandidate('Candidato Existente', newsArray);
    expect(result).toBe(mockCandidate);
    expect(mockCandidate.save).not.toHaveBeenCalled();
  });

  test('debe evitar duplicar noticias si el contenido es idéntico aunque la URL difiera', async () => {
    const mockCandidate = {
      nombre: 'Candidato Existente',
      historial_noticias: [{ 
        enlace_origen: 'url1', 
        contenido_crudo: 'Este es un contenido largo para probar el hash o corte del texto crudo que previene copias de contenido' 
      }],
      save: jest.fn().mockResolvedValue(true)
    };
    Candidato.findOne.mockResolvedValueOnce(mockCandidate);

    const newsArray = [{
      titular: 'T1',
      fecha: '2023-01-01',
      medio_prensa: 'Source',
      enlace_origen: 'url2',
      contenido_crudo: 'Este es un contenido largo para probar el hash o corte del texto crudo que previene copias de contenido'
    }];

    await dbService.pushNewsToCandidate('Candidato Existente', newsArray);
    expect(mockCandidate.save).not.toHaveBeenCalled();
  });

  test('debe arrojar un error y loguear en caso de fallo en BD', async () => {
    Candidato.findOne.mockRejectedValueOnce(new Error('DB Query Failure'));
    
    await expect(dbService.pushNewsToCandidate('Candidato', [{ enlace_origen: 'x' }]))
      .rejects.toThrow('DB Query Failure');
  });
});
