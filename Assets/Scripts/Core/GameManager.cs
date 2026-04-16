using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    [Header("UI")]
    [SerializeField] private GameObject startPanel;
    [SerializeField] private GameObject finishPanel;
    [SerializeField] private Text finishText;

    private bool raceStarted;

    public bool IsRaceStarted => raceStarted;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }

        Instance = this;
    }

    private void Start()
    {
        Time.timeScale = 0f;
        raceStarted = false;

        if (startPanel != null)
        {
            startPanel.SetActive(true);
        }

        if (finishPanel != null)
        {
            finishPanel.SetActive(false);
        }
    }

    private void Update()
    {
        if (!raceStarted && (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return)))
        {
            StartRace();
        }

        if (Input.GetKeyDown(KeyCode.R))
        {
            RestartRace();
        }
    }

    public void StartRace()
    {
        raceStarted = true;
        Time.timeScale = 1f;

        if (startPanel != null)
        {
            startPanel.SetActive(false);
        }
    }

    public void OnPlayerFinished(int position)
    {
        raceStarted = false;
        Time.timeScale = 0f;

        if (finishPanel != null)
        {
            finishPanel.SetActive(true);
        }

        if (finishText != null)
        {
            finishText.text = "Llegaste en posicion " + position + "\nPulsa R para reiniciar";
        }
    }

    public void RestartRace()
    {
        Time.timeScale = 1f;
        SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex);
    }
}
