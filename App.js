import { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Alert, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library/legacy';

const { width, height } = Dimensions.get('window');

export default function App() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermissionResponse, requestMediaPermission] = MediaLibrary.usePermissions();
  
  const [overlayImage, setOverlayImage] = useState(null);
  const [overlaySize, setOverlaySize] = useState({ width: width, height: height });
  const [opacity, setOpacity] = useState(0.5);
  const [cameraKey, setCameraKey] = useState(0);
  
  // State untuk fitur baru
  const [facing, setFacing] = useState('back');
  const [ratio, setRatio] = useState('4:3'); // Pilihan: '4:3', '16:9', '1:1'
  const [timer, setTimer] = useState(0); // Pilihan: 0, 3, 5 detik
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownCount, setCountdownCount] = useState(0);
  const [livePhoto, setLivePhoto] = useState(false); // Khusus iOS

  const cameraRef = useRef(null);

  useEffect(() => {
    if (cameraPermission?.granted) {
      const timeout = setTimeout(() => {
        setCameraKey(prev => prev + 1); 
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [cameraPermission]);

  if (!cameraPermission || !mediaPermissionResponse) return <View style={styles.container} />;

  if (!cameraPermission.granted || !mediaPermissionResponse.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Aplikasi butuh akses Kamera & Galeri</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={async () => { 
          await requestCameraPermission(); 
          await requestMediaPermission(); 
        }}>
          <Text style={{fontWeight: 'bold', color: 'white'}}>Beri Akses</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setOverlayImage(asset.uri);
      
      // Menghitung ukuran asli gambar agar proporsional dan tidak memaksa penuh ke layar
      Image.getSize(asset.uri, (imgWidth, imgHeight) => {
        const screenWidth = width;
        const calculatedHeight = (imgHeight * screenWidth) / imgWidth;
        setOverlaySize({ width: screenWidth, height: calculatedHeight });
      }, (error) => {
        console.log("Gagal membaca ukuran gambar:", error);
        setOverlaySize({ width: width, height: height * 0.7 });
      });

      setCameraKey(prev => prev + 1); 
    }
  };

  const executeCapture = async () => {
    if (!cameraRef.current) {
      Alert.alert("Info", "Kamera belum siap, coba sesaat lagi.");
      return;
    }

    try {
      if (mediaPermissionResponse.status !== 'granted') {
        const { status } = await requestMediaPermission();
        if (status !== 'granted') {
           Alert.alert("Izin Ditolak", "Aplikasi butuh izin akses galeri untuk menyimpan foto.");
           return;
        }
      }

      const options = {
        quality: 0.9, 
        skipProcessing: true,
      };

      // Menambahkan opsi livePhoto jika diaktifkan (khusus iOS)
      if (livePhoto) {
        options.livePhoto = true;
      }

      const photo = await cameraRef.current.takePictureAsync(options);
      
      if (photo && photo.uri) {
        await MediaLibrary.saveToLibraryAsync(photo.uri);
        Alert.alert("Berhasil!", "Foto berhasil tersimpan ke galeri.");
      } else {
        Alert.alert("Error", "Kamera tidak menghasilkan file foto.");
      }
    } catch (e) {
      Alert.alert("Error Detail", e.message || String(e));
    }
  };

  const takePhoto = () => {
    if (isCountingDown) return;

    if (timer > 0) {
      setIsCountingDown(true);
      setCountdownCount(timer);

      let currentCount = timer;
      const interval = setInterval(() => {
        currentCount -= 1;
        if (currentCount > 0) {
          setCountdownCount(currentCount);
        } else {
          clearInterval(interval);
          setIsCountingDown(false);
          executeCapture();
        }
      }, 1000);
    } else {
      executeCapture();
    }
  };

  const changeOpacity = () => {
    if (opacity === 0.3) setOpacity(0.6);
    else if (opacity === 0.6) setOpacity(0.9);
    else setOpacity(0.3);
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const cycleRatio = () => {
    if (ratio === '4:3') setRatio('16:9');
    else if (ratio === '16:9') setRatio('1:1');
    else setRatio('4:3');
  };

  const cycleTimer = () => {
    if (timer === 0) setTimer(3);
    else if (timer === 3) setTimer(5);
    else setTimer(0);
  };

  const toggleLivePhoto = () => {
    setLivePhoto(prev => !prev);
  };

  return (
    <View style={styles.container}>
      {cameraPermission.granted && (
        <CameraView 
          key={cameraKey} 
          style={[
            styles.camera, 
            ratio === '16:9' ? styles.ratio16_9 : ratio === '1:1' ? styles.ratio1_1 : styles.ratio4_3
          ]} 
          facing={facing} 
          mode="picture"
          ref={cameraRef} 
        />
      )}

      {overlayImage && (
        <View style={styles.overlayContainer} pointerEvents="none">
          <Image 
            source={{ uri: overlayImage }} 
            style={[
              { width: overlaySize.width, height: overlaySize.height, opacity }, 
              styles.overlayImageStyle
            ]} 
          />
        </View>
      )}

      {isCountingDown && (
        <View style={styles.countdownContainer} pointerEvents="none">
          <Text style={styles.countdownText}>{countdownCount}</Text>
        </View>
      )}

      <View style={styles.overlayUI} pointerEvents="box-none">
        {/* Bar Menu Pengaturan Tambahan di Atas */}
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.topBtn} onPress={cycleRatio}>
            <Text style={styles.topBtnText}>Rasio: {ratio}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.topBtn} onPress={cycleTimer}>
            <Text style={styles.topBtnText}>Timer: {timer === 0 ? 'OFF' : `${timer}s`}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.topBtn} onPress={toggleLivePhoto}>
            <Text style={[styles.topBtnText, { color: livePhoto ? '#4CD964' : 'white' }]}>
              Live: {livePhoto ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.topBtn} onPress={toggleCameraFacing}>
            <Text style={styles.topBtnText}>Putar</Text>
          </TouchableOpacity>
        </View>

        {overlayImage && (
          <TouchableOpacity style={styles.opacityBtn} onPress={changeOpacity}>
            <Text style={styles.opacityText}>Transparansi: {Math.round(opacity * 100)}%</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.controls}>
          <TouchableOpacity style={styles.btnSmall} onPress={pickImage}>
            <Text style={styles.btnSmallText}>Pilih Foto</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.btnSmall} onPress={() => setOverlayImage(null)}>
            <Text style={styles.btnSmallText}>Hapus Foto</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
  camera: { 
    position: 'absolute',
    width: width,
  },
  ratio4_3: { height: (width * 4) / 3 },
  ratio16_9: { height: (width * 16) / 9 },
  ratio1_1: { height: width },
  
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayImageStyle: {
    resizeMode: 'contain',
  },
  countdownContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: width,
    height: height,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  countdownText: {
    fontSize: 80,
    fontWeight: 'bold',
    color: 'white',
  },
  overlayUI: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 50,
    paddingBottom: 40,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 10,
  },
  topBtn: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#555',
  },
  topBtnText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  opacityBtn: { 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    borderRadius: 20, 
    borderWidth: 1,
    borderColor: '#666'
  },
  opacityText: { color: 'white', fontSize: 13, fontWeight: 'bold' },
  controls: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    alignItems: 'center', 
    width: '100%',
    paddingHorizontal: 20
  },
  btnSmall: { 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    paddingVertical: 12, 
    paddingHorizontal: 15, 
    borderRadius: 10, 
    width: 95, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#555' 
  },
  btnSmallText: { color: 'white', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  permissionBtn: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignSelf: 'center' },
  captureBtn: { 
    width: 75, 
    height: 75, 
    borderRadius: 37.5, 
    backgroundColor: 'white', 
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.8, 
    shadowRadius: 2 
  },
  captureBtnInner: { width: 63, height: 63, borderRadius: 31.5, borderWidth: 2, borderColor: 'black' }
});
